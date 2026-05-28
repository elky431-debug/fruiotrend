import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { getTemplateConfig } from "@/lib/adTemplates";
import { inferBackground } from "@/lib/inferBackground";
import type { AdTemplate, ProductInput } from "@/types/ad";

const TEMPLATE_VOICEOVER_EXAMPLES: Record<string, string[]> = {
  "Produit Vivant": [
    "Je me réveille. Et je n'attends qu'une chose — toi.",
    "Tu crois que tes muscles peuvent se passer de moi ?",
    "Je suis petit. Mais je fais des grandes choses.",
  ],
  "Influenceur Cartoon": [
    "Tiens-moi. Je vais te montrer pourquoi ils m'adorent.",
    "Tu me regardes ? Bien. Écoute ce que je peux faire.",
    "Sans moi, ta routine est incomplète. Vraiment.",
  ],
  "Avant / Après": [
    "Avant moi, tu souffrais. Maintenant regarde-toi.",
    "Il y a eu un avant. Et il y a moi.",
    "La douleur, c'était avant. Je suis l'après.",
  ],
  "Démo Produit": [
    "Regarde bien. Tu ne verras plus jamais la douleur pareil.",
    "Trois réglages. Un résultat. Moi.",
    "J'ai été conçu pour ça. Et je suis très bon.",
  ],
  Lifestyle: [
    "Je t'accompagne. Le matin. Le soir. Partout.",
    "Ta routine sans moi ? Elle me manque déjà.",
    "Chaque muscle. Chaque soir. C'est ma promesse.",
  ],
  "Problème Absurde": [
    "Sans moi ? Bonne chance avec ça.",
    "Tu rigoles ? Moi, je règle le problème.",
    "Ils ont tout essayé. Puis ils m'ont trouvé.",
  ],
  "Unboxing Premium": [
    "Ouvre-moi. Tu vas comprendre.",
    "Je suis là. Enfin. Pour toi.",
    "Le moment que tu attendais ? C'est maintenant.",
  ],
  Témoignages: [
    "Ils ne peuvent plus s'en passer. Moi non plus de toi.",
    "Une fois que tu m'as essayé, tu comprends.",
    "Je suis devenu indispensable. Comme prévu.",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { product } = (await req.json()) as { product: ProductInput };

    if (!product?.name?.trim() || !product?.description?.trim()) {
      return NextResponse.json(
        { error: "Nom et description du produit requis" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY manquante" },
        { status: 500 }
      );
    }

    const template = (product.template || "living_product") as AdTemplate;
    const templateMeta = getTemplateConfig(template);
    const nScenes = Math.min(Math.max(Number(product.nScenes) || 1, 1), 3);
    const totalDuration = [15, 30, 45].includes(Number(product.duration))
      ? Number(product.duration)
      : 30;
    const secondsPerScene = Math.max(2, Math.floor(totalDuration / nScenes));
    const wordsPerScene = Math.max(
      3,
      Math.floor(secondsPerScene * 2.3)
    );

    const narrativePlan =
      nScenes === 1
        ? "SCÈNE UNIQUE : raconte le problème ET la solution dans la même scène (arc complet)."
        : nScenes === 2
          ? "SCÈNE 1 narrative_role=problem | SCÈNE 2 narrative_role=solution"
          : "SCÈNE 1 narrative_role=problem | SCÈNE 2 narrative_role=discovery | SCÈNE 3 narrative_role=solution";

    let productVisualDescription = product.name;
    const client = new OpenAI({ apiKey });

    if (product.images?.length > 0) {
      try {
        const imageContents = product.images
          .slice(0, 3)
          .map((img: string, i: number) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${product.imagesMimeType?.[i] || "image/jpeg"};base64,${img}`,
              detail: "high" as const,
            },
          }));

        const visionRes = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                ...imageContents,
                {
                  type: "text",
                  text: `Décris ce produit en 2 à 3 phrases très précises pour un illustrateur.
Mentionne : forme exacte, couleurs précises, packaging, logo/texte visible, finition (mat/brillant), détails distinctifs.
Réponds en anglais pour les prompts image. Sois très spécifique sur les couleurs.`,
                },
              ],
            },
          ],
          max_tokens: 400,
        });

        const visionText = visionRes.choices[0]?.message?.content?.trim();
        if (visionText) {
          productVisualDescription = visionText;
        }
      } catch (e) {
        console.warn("Vision analysis failed, fallback to product name:", e);
      }
    }

    const isLivingProduct = product.template === "living_product";
    const templateLabel = templateMeta.name;
    const voiceoverExamples =
      TEMPLATE_VOICEOVER_EXAMPLES[templateLabel] ||
      TEMPLATE_VOICEOVER_EXAMPLES["Produit Vivant"];
    const examplesBlock = voiceoverExamples.map((e) => `"${e}"`).join("\n");

    const systemPrompt = `Tu es un expert en publicité vidéo virale pour dropshippers.
Tu génères des scripts de pubs où LE PRODUIT parle à la 1ère personne.
Le script doit raconter une VRAIE HISTOIRE en 3 temps : problème → tension → solution.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 1 — STRUCTURE NARRATIVE OBLIGATOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCÈNE 1 (problem) — LE PROBLÈME : douleur, frustration, situation difficile du spectateur AVANT le produit.
SCÈNE 2 (discovery, si 2+ scènes) — LA TENSION : moment où tout bascule, curiosité, espoir.
SCÈNE FINALE (solution) — LA TRANSFORMATION : le produit résout tout, vie meilleure, CTA émotionnel.

${narrativePlan}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 2 — LE PRODUIT PARLE (1ÈRE PERSONNE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ "Je suis là. Chaque soir. Pour toi."
✅ "Tu souffres encore ? Laisse-moi m'en occuper."
✅ "Avant moi, tu endurais. Maintenant, tu récupères."
❌ JAMAIS "Ce produit va changer votre vie."
❌ JAMAIS de narrateur externe

EXEMPLES (${templateLabel}) :
${examplesBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 3 — DURÉE EXACTE : ${totalDuration} SECONDES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHAQUE scène dure exactement ${secondsPerScene} secondes.
Le voiceover de chaque scène doit faire EXACTEMENT ${wordsPerScene} mots (compte les mots).
${wordsPerScene} mots ≈ ${secondsPerScene}s à 2,3 mots/seconde (débit français naturel).
COMPTE les mots de chaque voiceover — cible ${wordsPerScene} ± 1 mot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 4 — DÉCOR LIÉ AU PRODUIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"background" EN ANGLAIS — décor d'usage réel, JAMAIS fond blanc/neutre.
Produit : ${product.name} — ${product.description}
Référence visuelle : "${productVisualDescription}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARAMÈTRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template : ${templateLabel} (${template})
Cible : ${product.targetAudience}
Objectif : ${product.adGoal}
Durée totale : ${totalDuration}s (${nScenes} scène(s) × ${secondsPerScene}s)
Mots par voiceover : ${wordsPerScene}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT JSON STRICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "title": "Titre accrocheur de la pub",
  "hook": "Accroche 1ère personne (français)",
  "cta": "CTA final 1ère personne (français)",
  "totalDuration": ${totalDuration},
  "duration": "${totalDuration}s",
  "productVisualDescription": "${productVisualDescription}",
  "character": {
    "name": "${isLivingProduct ? product.name : "Personnage"}",
    "type": "${isLivingProduct ? "le produit lui-même qui prend vie" : "personnage cartoon"}",
    "description": "personnalité Pixar",
    "outfit": "n/a",
    "personality": "direct, chaleureux",
    "gemini_character_prompt": "Pixar 3D product with eyes only"
  },
  "scenes": [
    {
      "number": 1,
      "title": "Titre court",
      "narrative_role": "problem|discovery|solution",
      "background": "Décor EN ANGLAIS lié au produit et au rôle narratif",
      "visual_description": "Scène EN ANGLAIS — produit Pixar avec yeux ET bouche expressive + décor",
      "character_action": "Action du produit EN ANGLAIS (sans bras — bouche qui parle)",
      "voiceover": "EXACTEMENT ${wordsPerScene} MOTS en français — 1ère personne, dit par le produit",
      "voiceover_word_count": ${wordsPerScene},
      "duration_seconds": ${secondsPerScene},
      "mouth_expression": "big smile|smirk|open mouth speaking|surprised O|determined",
      "emotion": "excited|dramatic|whisper|happy|intense|triumphant|empathy|mysterious",
      "grok_video_prompt": "Prompt vidéo EN ANGLAIS — caméra + mouvement + bouche qui parle",
      "subtitle": "MOT CHOC — max 3 mots MAJUSCULES"
    }
  ]
}

${nScenes === 1 ? "⚠️ UNE SEULE SCÈNE — tableau scenes avec EXACTEMENT 1 objet (problème + solution)." : `⚠️ EXACTEMENT ${nScenes} SCÈNES.`}`;

    const defaultRoles: Array<"problem" | "discovery" | "solution"> =
      nScenes === 1
        ? ["solution"]
        : nScenes === 2
          ? ["problem", "solution"]
          : ["problem", "discovery", "solution"];

    type ScriptDraft = {
      duration?: string;
      productVisualDescription?: string;
      nScenes?: number;
      totalDuration?: number;
      title?: string;
      hook?: string;
      cta?: string;
      scenes?: Array<{
        number?: number;
        narrative_role?: string;
        duration_seconds?: number;
        voiceover_word_count?: number;
        gemini_prompt?: string;
        productVisualDescription?: string;
        grok_video_prompt?: string;
        video_prompt?: string;
        grok_prompt?: string;
        animation_prompt?: string;
        visual_description?: string;
        title?: string;
        character_action?: string;
        emotion?: string;
        voiceover?: string;
        mouth_expression?: string;
        background?: string;
        hook?: string;
        subtitle?: string;
      }>;
    };

    let script: ScriptDraft | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Génère le script pour : ${product.name}. ${product.description}. Template: ${templateLabel}. EXACTEMENT ${nScenes} scène(s). EXACTEMENT ${wordsPerScene} mots par voiceover.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) continue;

      let parsed: ScriptDraft;
      try {
        parsed = JSON.parse(raw) as ScriptDraft;
      } catch {
        continue;
      }

      if (!parsed?.scenes || !Array.isArray(parsed.scenes)) continue;

      if (parsed.scenes.length !== nScenes) {
        console.warn(
          `[SCRIPT] Attempt ${attempt + 1}: ${parsed.scenes.length} scènes au lieu de ${nScenes}`
        );
        if (parsed.scenes.length > nScenes) {
          parsed.scenes = parsed.scenes.slice(0, nScenes);
        } else {
          continue;
        }
      }

      const wordCountsOk = parsed.scenes.every((scene) => {
        const wc =
          scene.voiceover?.trim().split(/\s+/).filter(Boolean).length || 0;
        return Math.abs(wc - wordsPerScene) <= 1;
      });

      if (!wordCountsOk) {
        console.warn(
          `[SCRIPT] Attempt ${attempt + 1}: voiceover hors cible (${wordsPerScene} ± 1 mots)`
        );
        continue;
      }

      script = parsed;
      break;
    }

    if (!script?.scenes) {
      return NextResponse.json(
        { error: "Impossible de générer un script valide après 3 tentatives" },
        { status: 500 }
      );
    }

    script.scenes = script.scenes.map((scene, i) => ({
      ...scene,
      number: i + 1,
    }));
    script.nScenes = nScenes;
    script.totalDuration = totalDuration;
    script.productVisualDescription =
      script.productVisualDescription || productVisualDescription;
    script.duration = script.duration || `${totalDuration}s`;
    script.hook =
      script.hook || script.scenes[0]?.voiceover || script.title || "";
    script.cta =
      script.cta ||
      script.scenes[script.scenes.length - 1]?.voiceover ||
      "";

    script.scenes = script.scenes.map((scene, i) => {
      const background =
        scene.background?.trim() ||
        inferBackground(`${product.name} ${product.description}`);

      let visualDescription = scene.visual_description?.trim() || "";
      if (visualDescription && !visualDescription.toLowerCase().includes(background.slice(0, 20).toLowerCase())) {
        visualDescription = `${visualDescription}. Setting: ${background}`;
      }
      if (!visualDescription) {
        visualDescription = `Pixar 3D product hero in setting: ${background}`;
      }

      const currentPrompt = scene.gemini_prompt || "";
      const pixarBase =
        "Pixar/DreamWorks 3D CGI Toy Story quality, subsurface scattering, oversized expressive cartoon eyes, vibrant oversaturated colors, rim lighting, depth of field bokeh, NOT photorealistic. ";
      const role =
        (scene.narrative_role as "problem" | "discovery" | "solution") ||
        defaultRoles[i] ||
        "solution";

      const wordCount =
        scene.voiceover?.trim().split(/\s+/).filter(Boolean).length || 0;
      console.log(
        `[SCRIPT] Scène ${i + 1}: ${wordCount} mots (cible: ${wordsPerScene})`
      );

      const mouthExpression =
        scene.mouth_expression || defaultMouthForRole(role);

      const livingProductBlock = isLivingProduct
        ? `The product ${product.name} IS the sole hero with large Pixar eyes AND an expressive speaking mouth on its front surface (no arms, no limbs). Exact shape and colors: ${productVisualDescription}. `
        : "";

      const fixedGeminiPrompt =
        pixarBase +
        livingProductBlock +
        `Mouth expression: ${mouthExpression}. ` +
        `BACKGROUND: ${background}. ` +
        (currentPrompt.includes(productVisualDescription.slice(0, 20))
          ? currentPrompt
          : `${currentPrompt} PRODUCT EXACT: ${productVisualDescription}.`) +
        " VERTICAL 9:16. ONE product character only — NO other faced objects in background. NO white plain background.";

      const fixedVideoPrompt =
        `${livingProductBlock}Setting: ${background}. ` +
        (
          scene.grok_video_prompt ||
          scene.video_prompt ||
          scene.grok_prompt ||
          scene.animation_prompt ||
          `Pixar 3D animated commercial, vertical 9:16. ${visualDescription}. ${scene.character_action || "product speaks with animated mouth"}.`
        ) +
        ` Mouth (${mouthExpression}) animates as if speaking the voiceover. No other characters with faces. Smooth camera push-in, cinematic lighting.`;

      return {
        ...scene,
        narrative_role: role,
        duration_seconds: secondsPerScene,
        voiceover_word_count: wordCount,
        background,
        visual_description: visualDescription,
        character_action:
          scene.character_action ||
          "Product speaks — mouth and eyes animated, no limbs",
        mouth_expression: mouthExpression,
        hook: scene.hook || scene.voiceover || "",
        gemini_prompt: fixedGeminiPrompt,
        grok_video_prompt: fixedVideoPrompt,
        productVisualDescription,
      };
    });

    return NextResponse.json(script);
  } catch (err) {
    console.error("api/script:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur script pub" },
      { status: 500 }
    );
  }
}

function defaultMouthForRole(
  role: "problem" | "discovery" | "solution"
): string {
  if (role === "problem") return "concerned open mouth";
  if (role === "discovery") return "surprised O";
  return "big smile";
}
