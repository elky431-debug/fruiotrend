import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import {
  buildScriptVisualPromptExtras,
  getTemplateConfig,
  normalizeAdTemplate,
  TEMPLATE_SYSTEM_PROMPTS,
  usesHumanPresenter,
} from "@/lib/adTemplates";
import { inferBackground } from "@/lib/inferBackground";
import type { AdCharacter, AdTemplate, ProductInput } from "@/types/ad";

function buildVisceralHookSection(
  nScenes: number,
  minWords: number,
  maxWords: number
): string {
  const wordRange = `${minWords}-${maxWords} mots`;
  const structureBlock =
    nScenes === 1
      ? `1 SCÈNE : Accroche + Problème viscéral + Solution + CTA (${wordRange})
→ Remplir toute la durée de la scène — pas de blanc.`
      : nScenes === 2
        ? `2 SCÈNES (${wordRange} chacune) :
- Scène 1 : Accroche choc + Problème viscéral
- Scène 2 : Solution concrète + Résultat + CTA`
        : `3 SCÈNES (${wordRange} chacune) :
- Scène 1 : Accroche choc — interpeller la cible sur sa douleur précise
- Scène 2 : Aggraver le problème — montrer que ça empire sans solution
- Scène 3 : Solution + Résultat concret + CTA direct`;

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE ACCROCHE — LE PROBLÈME DOIT FAIRE MAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Le hook doit identifier une DOULEUR PRÉCISE et VISCÉRALE.
Le spectateur doit se reconnaître immédiatement et penser "c'est exactement moi".

FORMULE UNIVERSELLE POUR TOUT PRODUIT :
"Si tu [situation précise que vit la cible] et que [conséquence douloureuse]..."

RÈGLES DU PROBLÈME PARFAIT :
1. PRÉCIS — nommer une situation concrète, pas générale
2. VISCÉRAL — décrire ce que ça fait ressentir émotionnellement
3. PERSONNEL — s'adresser à UNE personne, pas à "les gens"
4. RECONNAISSABLE — quelque chose que la cible vit vraiment au quotidien
5. FRUSTRANT — idéalement mentionner que la cible a déjà essayé d'autres choses

EXEMPLES PAR CATÉGORIE :

SPORT/RÉCUPÉRATION :
❌ "Si tu fais du sport et t'es fatigué..."
✅ "Si tu te lèves le matin après une séance et que tes jambes refusent de bouger..."
✅ "Si tu rentres de la salle et que la douleur te colle pendant 3 jours..."

BEAUTÉ/PEAU :
❌ "Si ta peau te déprime..."
✅ "Si tu appliques des crèmes depuis des années et que tes rides restent là à te narguer..."
✅ "Si tu te caches sous du fond de teint parce que ta peau te fait honte..."

SOMMEIL/BIEN-ÊTRE :
❌ "Si tu dors mal..."
✅ "Si tu te retournes dans ton lit pendant des heures et tu attends le matin avec dread..."
✅ "Si tu te réveilles plus fatigué que quand tu t'es couché..."

ALIMENTATION/CUISINE :
❌ "Si tu veux manger mieux..."
✅ "Si tu commandes à livrer parce que cuisiner sain te prend 2 heures que t'as pas..."
✅ "Si tu regardes ton ventre dans le miroir et que tu retardes encore ta mise en forme..."

GADGET/TECH :
❌ "Si ton téléphone t'énerve..."
✅ "Si ton téléphone lâche à 15% pile quand t'en as le plus besoin..."
✅ "Si tu passes ta journée à chercher une prise parce que ta batterie tient plus..."

MODE/ACCESSOIRES :
❌ "Si tu n'aimes pas ton style..."
✅ "Si tu ouvres ton placard plein de fringues et que t'as rien à mettre..."

DOULEUR/SANTÉ :
❌ "Si tu as mal..."
✅ "Si tu prends des anti-douleurs comme des bonbons depuis des mois et rien ne change..."
✅ "Si tu évites certains mouvements parce que tu sais que ça va faire mal..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE DU SCRIPT PAR NOMBRE DE SCÈNES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${structureBlock}

VALIDATION OBLIGATOIRE DU HOOK :
□ Est-ce que quelqu'un peut lire ce hook et dire "c'est exactement ma vie" ?
□ Est-ce que le problème est PRÉCIS (pas générique) ?
□ Est-ce que ça fait ressentir quelque chose émotionnellement ?
□ Est-ce que le produit est mentionné comme LA solution parfaite à CE problème précis ?
Si une case n'est pas cochée → RECOMMENCE le hook.`;
}

function buildCourtxSystemPrompt(opts: {
  nScenes: number;
  totalDuration: number;
  secondsPerScene: number;
  wordsPerScene: number;
  minWords: number;
  maxWords: number;
  productName: string;
  productDescription: string;
  productVisualDescription: string;
  template: AdTemplate;
  templateLabel: string;
  templateStyleBlock: string;
  audience: string;
  objective: string;
  humanPresenter: boolean;
}): string {
  const {
    nScenes,
    totalDuration,
    secondsPerScene,
    wordsPerScene,
    minWords,
    maxWords,
    productName,
    productDescription,
    productVisualDescription,
    template,
    templateLabel,
    templateStyleBlock,
    audience,
    objective,
    humanPresenter,
  } = opts;

  const voiceRule = humanPresenter
    ? `RÈGLE 1 — L'INFLUENCEUR PARLE (UGC direct, tutoiement)
✅ "Si tu souffres comme moi, ce truc change tout."
✅ "Tu dois voir ça. Sérieusement. Commande maintenant."
❌ Le produit ne parle PAS à la 1ère personne
❌ "Ce produit va vous aider."`
    : template === "product_demo"
      ? `RÈGLE 1 — VOIX OFF COURTE ET PREMIUM (2e personne, pas de visage sur le produit)
✅ "Tu vois cette finition ? C'est pensé pour toi."
✅ "Chaque détail compte. Prends-le aujourd'hui."
❌ "Je suis le meilleur produit du marché."`
      : `RÈGLE 1 — LE PRODUIT PARLE À LA 1ÈRE PERSONNE
✅ "Je vais soulager ta douleur."
✅ "Tu as besoin de moi."
✅ "Prends-moi maintenant."
❌ "Ce produit va vous aider."
❌ "Découvrez notre solution."
❌ "Commandez dès maintenant sur notre site."`;

  return `Tu es un expert en publicité vidéo virale pour dropshippers.
Tu génères des scripts courts et percutants dans le style des meilleures pubs TikTok/Reels.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÉFÉRENCE STYLE — COURTX (semelle padel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Voici le script de référence parfait à imiter :
"Si tu fais du padel et t'as mal aux pieds, alors tu dois m'acheter.
Je vais t'aider à soulager tes douleurs et éviter les blessures."

Pourquoi ce script est parfait :
- Le produit parle directement à UNE personne précise ("si tu fais du padel")
- Il identifie LE problème exact ("t'as mal aux pieds")
- Il donne LA solution immédiate ("tu dois m'acheter")
- Il promet UN résultat concret ("soulager les douleurs, éviter les blessures")
- Zéro mot inutile. Zéro fioriture. 100% percutant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildVisceralHookSection(nScenes, minWords, maxWords)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE DURÉE — REMPLIR TOUTE LA VIDÉO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
La vidéo dure ${totalDuration} secondes au total.
Chaque scène dure ${secondsPerScene} secondes.
Le voiceover DOIT remplir toute la durée de la scène — pas de blanc, pas de silence.

CALCUL OBLIGATOIRE :
- Débit de parole naturel : 2.3 mots/seconde
- Pour ${secondsPerScene}s → tu dois écrire entre ${minWords} et ${maxWords} mots
- Cible idéale : ${wordsPerScene} mots

EXEMPLES CALIBRÉS :
- 5s → 10-12 mots : "Si tu souffres des pieds, je suis ta solution. Prends-moi."
- 10s → 20-23 mots : "Tu rentres du sport épuisé et tu souffres depuis des mois. J'ai été créé pour toi. Je répare tes muscles en quelques minutes."
- 15s → 30-34 mots : "Tu appliques des crèmes depuis des années et tes rides restent là à te narguer. Arrête de perdre ton temps et ton argent. Je suis différent. En 30 jours, ta peau change vraiment. Essaie-moi."

RÈGLE ABSOLUE :
Si le voiceover fait moins de ${minWords} mots → TROP COURT → il y aura du blanc → REFAIRE
Si le voiceover fait plus de ${maxWords} mots → TROP LONG → l'audio déborde → COUPER

COMPTE LES MOTS avant de valider chaque voiceover.
${wordsPerScene} mots = ${secondsPerScene} secondes = vidéo remplie parfaitement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES D'ÉCRITURE ABSOLUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${voiceRule}

RÈGLE 2 — ${minWords}-${maxWords} MOTS PAR VOICEOVER (cible ${wordsPerScene})
Compte les mots avant de valider. Trop court = silence. Trop long = audio coupé.

RÈGLE 3 — MOTS INTERDITS
❌ "incroyable", "révolutionnaire", "innovant", "unique", "exclusif"
❌ "notre produit", "cette solution", "cet article"
❌ Tout superlatif vide de sens

RÈGLE 4 — VERBES D'ACTION FORTS
✅ "soulage", "efface", "libère", "transforme", "stoppe", "répare"
✅ "prends", "commande", "essaie", "découvre"
Chaque verbe doit créer une image mentale immédiate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLES SCRIPTS COMPLETS (style viscéral)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SPORT/RÉCUPÉRATION :
"Si tu rentres de la salle et que la douleur te colle 3 jours, j'ai la solution. Prends-moi."

BEAUTÉ/PEAU :
"Si tes rides te narguent malgré tes crèmes, je transforme ta peau en 30 jours. Commande."

GADGET/TECH :
"Si ta batterie lâche à 15% au pire moment, je te garde connecté toute la journée. Prends-moi."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUEL — TEMPLATE ${templateLabel.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${templateStyleBlock}
Référence visuelle produit : "${productVisualDescription}"
visual_description et gemini_prompt : EN ANGLAIS, respecte strictement ce template.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARAMÈTRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Produit : ${productName} — ${productDescription}
Template : ${templateLabel} (${template})
Cible : ${audience}
Objectif : ${objective}
Durée totale : ${totalDuration}s — ${nScenes} scène(s) — ${secondsPerScene}s/scène
Mots par voiceover : ${minWords}-${maxWords} (cible ${wordsPerScene})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT JSON STRICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "title": "Titre court et accrocheur — max 5 mots",
  "hook": "Accroche scène 1 (français)",
  "cta": "CTA dernière scène (français)",
  "totalDuration": ${totalDuration},
  "duration": "${totalDuration}s",
  "productVisualDescription": "${productVisualDescription.replace(/"/g, '\\"')}",
  "scenes": [
    {
      "number": 1,
      "title": "Titre de la scène",
      "narrative_role": "hook|problem|solution|cta",
      "background": "Décor EN ANGLAIS contextuel au produit",
      "visual_description": "Description scène EN ANGLAIS pour Gemini",
      "character_action": "Action EN ANGLAIS",
      "voiceover": "${minWords}-${maxWords} mots EN FRANÇAIS — style Courtx, remplit ${secondsPerScene}s",
      "voiceover_word_count": ${wordsPerScene},
      "duration_seconds": ${secondsPerScene},
      "mouth_expression": "big smile|smirk|open mouth speaking|surprised|determined",
      "emotion": "excited|dramatic|whisper|confident|intense",
      "grok_video_prompt": "Prompt EN ANGLAIS — mouvement caméra Pixar 9:16",
      "subtitle": "2-3 MOTS CHOC EN MAJUSCULES"
    }
  ]
}

VALIDATION AVANT DE RÉPONDRE :
□ Le hook de la scène 1 fait mal — douleur précise et viscérale ?
□ Chaque voiceover fait entre ${minWords} et ${maxWords} mots (cible ${wordsPerScene}) ?
□ ${humanPresenter ? "L'influenceur parle directement à la cible ?" : template === "product_demo" ? "Voix off courte et premium ?" : "Le produit parle à la 1ère personne ?"}
□ Il y a exactement ${nScenes} scène(s) ?
Si une case n'est pas cochée → RECOMMENCE.`;
}

function buildDefaultCharacter(
  product: ProductInput,
  template: AdTemplate,
  humanPresenter: boolean
): AdCharacter {
  if (humanPresenter) {
    return {
      name: "Influenceur",
      type: "influenceur cartoon UGC",
      description: "Direct, enthousiaste, parle à la caméra style Courtx",
      outfit: "Tenue lifestyle adaptée à la cible",
      personality: "Authentique, punchy",
      gemini_character_prompt:
        "Pixar 3D human influencer, energetic, holds product, product has NO face",
    };
  }
  if (template === "product_demo") {
    return {
      name: product.name,
      type: "produit hero cinématographique",
      description: "Présentation premium Courtx — voix off percutante",
      outfit: "N/A",
      personality: "Premium, confiant",
      gemini_character_prompt:
        "Cinematic product hero shot only — no cartoon face on product",
    };
  }
  return {
    name: product.name,
    type: "le produit lui-même qui prend vie",
    description: "Parle à la 1ère personne, style Courtx TikTok",
    outfit: "N/A",
    personality: "Direct, percutant, tutoiement",
    gemini_character_prompt:
      "Pixar 3D product with expressive eyes and mouth only",
  };
}

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

    const template = normalizeAdTemplate(product.template);
    console.log("[SCRIPT] Template reçu:", template);
    const templateMeta = getTemplateConfig(template);
    const templateStyleBlock =
      TEMPLATE_SYSTEM_PROMPTS[template] || TEMPLATE_SYSTEM_PROMPTS.living_product;
    const nScenes = Math.min(Math.max(Number(product.nScenes) || 1, 1), 3);
    const totalDuration = [15, 30, 45].includes(Number(product.duration))
      ? Number(product.duration)
      : 30;
    const totalSeconds = totalDuration;
    const secondsPerScene = Math.floor(totalSeconds / nScenes);
    const wordsPerScene = Math.floor(secondsPerScene * 2.3 * 0.9);
    const minWords = Math.floor(secondsPerScene * 2.0);
    const maxWords = Math.floor(secondsPerScene * 2.5);

    console.log(
      `[SCRIPT] Durée ${totalSeconds}s / ${nScenes} scène(s) → ${secondsPerScene}s/scène, cible ${wordsPerScene} mots (${minWords}-${maxWords})`
    );

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

    const isLivingProduct = template === "living_product";
    const humanPresenter = usesHumanPresenter(template);
    const templateLabel = templateMeta.name;

    const systemPrompt = buildCourtxSystemPrompt({
      nScenes,
      totalDuration,
      secondsPerScene,
      wordsPerScene,
      minWords,
      maxWords,
      productName: product.name,
      productDescription: product.description,
      productVisualDescription,
      template,
      templateLabel,
      templateStyleBlock,
      audience: product.targetAudience,
      objective: product.adGoal,
      humanPresenter,
    });

    const defaultRoles: Array<"hook" | "problem" | "solution" | "cta"> =
      nScenes === 1
        ? ["cta"]
        : nScenes === 2
          ? ["problem", "cta"]
          : ["hook", "problem", "cta"];

    type ScriptDraft = {
      duration?: string;
      productVisualDescription?: string;
      nScenes?: number;
      totalDuration?: number;
      title?: string;
      hook?: string;
      cta?: string;
      character?: AdCharacter;
      scenes?: Array<{
        number?: number;
        index?: number;
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
        _tooShort?: boolean;
        _tooLong?: boolean;
      }>;
    };

    let script: ScriptDraft | null = null;
    let lastParsed: ScriptDraft | null = null;

    const countWords = (text?: string) =>
      text?.trim().split(/\s+/).filter(Boolean).length || 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      const lastAttempt = attempt === 2;
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Génère le script Courtx pour : ${product.name}. ${product.description}. Template: ${templateLabel}. EXACTEMENT ${nScenes} scène(s). Chaque voiceover doit faire entre ${minWords} et ${maxWords} mots (cible ${wordsPerScene}) pour remplir ${secondsPerScene}s. Cible: ${product.targetAudience}.`,
          },
        ],
        temperature: 0.72,
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

      lastParsed = parsed;

      if (parsed.scenes.length !== nScenes) {
        console.warn(
          `[SCRIPT] Attempt ${attempt + 1}: ${parsed.scenes.length} scènes au lieu de ${nScenes}`
        );
        if (parsed.scenes.length > nScenes) {
          parsed.scenes = parsed.scenes.slice(0, nScenes);
        } else if (!lastAttempt) {
          continue;
        }
      }

      parsed.scenes = parsed.scenes.map((scene, i) => {
        const words = (scene.voiceover || "").trim().split(/\s+/).filter(Boolean);

        if (words.length < minWords) {
          console.warn(
            `[SCRIPT] Scène ${i + 1}: ${words.length} mots — TROP COURT (min: ${minWords})`
          );
          scene._tooShort = true;
        }

        if (words.length > maxWords) {
          console.warn(
            `[SCRIPT] Scène ${i + 1}: ${words.length} mots — TROP LONG (max: ${maxWords})`
          );
          scene._tooLong = true;
        }

        console.log(
          `[SCRIPT] Scène ${i + 1}: ${words.length} mots (cible: ${wordsPerScene}, range: ${minWords}-${maxWords})`
        );

        return {
          ...scene,
          duration_seconds: secondsPerScene,
          voiceover_word_count: words.length,
        };
      });

      const hasTooShort = parsed.scenes.some((s) => s._tooShort);
      if (hasTooShort && attempt < 2) {
        console.warn("[SCRIPT] Voiceover trop court, retry...");
        continue;
      }

      const hasTooLong = parsed.scenes.some((s) => s._tooLong);
      if (hasTooLong && attempt < 2) {
        console.warn("[SCRIPT] Voiceover trop long, retry...");
        continue;
      }

      script = parsed;
      break;
    }

    if (!script?.scenes && lastParsed?.scenes?.length) {
      console.warn("[SCRIPT] Fallback — dernier brouillon GPT utilisé");
      script = {
        ...lastParsed,
        scenes: lastParsed.scenes.slice(0, nScenes),
      };
    }

    if (!script?.scenes?.length) {
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
    script.character =
      script.character || buildDefaultCharacter(product, template, humanPresenter);

    script.scenes = script.scenes.map((scene, i) => {
      const background =
        scene.background?.trim() ||
        inferBackground(`${product.name} ${product.description}`);

      let visualDescription = scene.visual_description?.trim() || "";
      if (
        visualDescription &&
        !visualDescription
          .toLowerCase()
          .includes(background.slice(0, 20).toLowerCase())
      ) {
        visualDescription = `${visualDescription}. Setting: ${background}`;
      }
      if (!visualDescription) {
        visualDescription =
          template === "influencer"
            ? `Pixar 3D human influencer holding ${product.name}, direct eye contact, product has no face, setting: ${background}`
            : isLivingProduct
              ? `Pixar 3D living product hero with eyes and mouth in setting: ${background}`
              : `Pixar 3D cinematic product hero shot of ${product.name} in setting: ${background}`;
      }

      const currentPrompt = scene.gemini_prompt || "";
      const pixarBase =
        "Pixar/DreamWorks 3D CGI Toy Story quality, subsurface scattering, oversized expressive cartoon eyes, vibrant oversaturated colors, rim lighting, depth of field bokeh, NOT photorealistic. ";
      const role =
        (scene.narrative_role as "hook" | "problem" | "solution" | "cta") ||
        defaultRoles[i] ||
        "solution";

      const wordCount = countWords(scene.voiceover);
      console.log(
        `[SCRIPT] Scène ${i + 1} final: ${wordCount} mots (cible: ${wordsPerScene}, range: ${minWords}-${maxWords})`
      );

      const mouthExpression =
        scene.mouth_expression || defaultMouthForRole(role);

      const visualExtras = buildScriptVisualPromptExtras(template, {
        productName: product.name,
        productVisualDescription,
        background,
        mouthExpression,
      });

      const fixedGeminiPrompt =
        pixarBase +
        visualExtras.geminiExtra +
        `Mouth expression: ${mouthExpression}. ` +
        `BACKGROUND: ${background}. ` +
        (currentPrompt.includes(productVisualDescription.slice(0, 20))
          ? currentPrompt
          : `${currentPrompt} PRODUCT EXACT: ${productVisualDescription}.`) +
        " VERTICAL 9:16. NO white plain background.";

      const fixedVideoPrompt =
        `${visualExtras.videoExtra}Setting: ${background}. ` +
        (
          scene.grok_video_prompt ||
          scene.video_prompt ||
          scene.grok_prompt ||
          scene.animation_prompt ||
          `Pixar 3D animated commercial, vertical 9:16. ${visualDescription}. ${scene.character_action || visualExtras.defaultCharacterAction}.`
        ) +
        ` Expression: ${mouthExpression}. Smooth camera push-in, cinematic lighting.`;

      const { _tooShort, _tooLong, ...sceneRest } = scene;

      return {
        ...sceneRest,
        narrative_role: role,
        duration_seconds: secondsPerScene,
        voiceover_word_count: wordCount,
        background,
        visual_description: visualDescription,
        character_action:
          scene.character_action || visualExtras.defaultCharacterAction,
        mouth_expression: mouthExpression,
        hook: scene.hook || scene.voiceover || "",
        subtitle: scene.subtitle || scene.title || `SCÈNE ${i + 1}`,
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

function defaultMouthForRole(role: string): string {
  if (role === "hook" || role === "problem") return "concerned open mouth";
  if (role === "discovery") return "surprised O";
  if (role === "cta" || role === "solution") return "big smile";
  return "open mouth speaking";
}
