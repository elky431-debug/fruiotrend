import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { TEMPLATE_SYSTEM_PROMPTS, getTemplateConfig } from "@/lib/adTemplates";
import type { AdTemplate, ProductInput } from "@/types/ad";

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
    const totalDuration = Math.max(Number(product.duration) || 15, 15);
    const durationPerScene = Math.max(5, Math.round(totalDuration / nScenes));
    const wordsPerScene = Math.max(12, Math.round(durationPerScene * 2.5));
    const templateInstructions =
      TEMPLATE_SYSTEM_PROMPTS[template] || TEMPLATE_SYSTEM_PROMPTS.influencer;
    const structurePlan =
      nScenes === 1
        ? "- Scène 1 : ATTENTION + DÉSIR + ACTION — hook immédiat, bénéfice principal, CTA clair."
        : nScenes === 2
          ? "- Scène 1 : ATTENTION + INTÉRÊT — hook visuel, problème relatable, empathie.\n- Scène 2 : DÉSIR + ACTION — solution produit, bénéfices concrets, CTA."
          : "- Scène 1 : ATTENTION — hook visuel + voiceover choc.\n- Scène 2 : INTÉRÊT — problème relatable, empathie.\n- Scène 3 : DÉSIR + ACTION — bénéfice concret + émotionnel du produit puis CTA.";

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

    const systemPrompt = `Tu es le meilleur copywriter de publicité directe au monde.
Tu écris des pubs vidéo TikTok/Reels qui VENDENT vraiment.
Tu utilises la structure AIDA : Attention → Intérêt → Désir → Action.

PRODUIT : ${product.name}
DESCRIPTION : ${product.description}
CIBLE : ${product.targetAudience}
OBJECTIF : ${product.adGoal}
FORMAT PUB : ${templateInstructions}
STYLE D'ACCROCHE : ${templateMeta.hook_style}
GÉNÈRE EXACTEMENT ${nScenes} SCÈNES — ni plus ni moins.
DURÉE TOTALE : ${totalDuration} secondes (${nScenes} scène${nScenes > 1 ? "s" : ""} × ~${durationPerScene}s chacune)
VOICEOVER : ${wordsPerScene} mots par scène environ (rythme naturel de parole)
Plus la durée est longue, plus le voiceover doit être développé et le storytelling riche.

DESCRIPTION VISUELLE DU PRODUIT :
"${productVisualDescription}"

RÈGLES DE COPYWRITING QUI VEND :
${structurePlan}

VOICEOVER : environ ${wordsPerScene} mots par scène, naturel, persuasif, développé si nécessaire.
SOUS-TITRES : 4 mots max. Phrase choc. Émotion forte.

JSON UNIQUEMENT (zéro markdown) :
{
  "title": "titre de la pub",
  "hook": "LA phrase d'accroche qui arrête le scroll",
  "cta": "call-to-action final irrésistible",
  "duration": "${totalDuration}s",
  "productVisualDescription": "${productVisualDescription}",
  "character": {
    "name": "nom du personnage/produit vivant",
    "type": "${isLivingProduct ? "le produit lui-même qui prend vie" : "personnage cartoon"}",
    "description": "description précise",
    "outfit": "apparence détaillée",
    "personality": "enthousiaste, convaincant, chaleureux",
    "gemini_character_prompt": "prompt character sheet"
  },
  "scenes": [
    {
      "number": 1,
      "title": "L'Accroche",
      "aida_stage": "ATTENTION",
      "visual_description": "description visuelle spectaculaire",
      "character_action": "action précise du personnage",
      "voiceover": "phrase(s) du voiceover — environ ${wordsPerScene} mots pour ~${durationPerScene} secondes d'audio",
      "subtitle": "ACCROCHE 4 MOTS",
      "hook": "élément accrocheur de la scène",
      "productVisualDescription": "${productVisualDescription}",
      "gemini_prompt": "Pixar/DreamWorks 3D animated commercial scene, VERTICAL 9:16 portrait. ${isLivingProduct ? `The product ${product.name} comes to life as an animated character: ${productVisualDescription}. The product has large expressive cartoon eyes integrated naturally, small arms and legs emerging from its body, keeping its exact original shape, colors and branding 100% intact. The product-character is animated, gesturing, expressive.` : `Animated cartoon character holding the product.`} PRODUCT VISUAL: ${productVisualDescription}. IMPORTANT: reproduce the product EXACTLY - same colors, same packaging, same logo, same proportions. [action de la scène]. [décor]. Ultra vibrant Pixar colors, cinematic commercial lighting, ultra detailed.",
      "grok_video_prompt": "Pixar 3D commercial video, 9:16. ${isLivingProduct ? `The product ${product.name} (${productVisualDescription}) is an animated character with expressive eyes and small arms, keeping exact product appearance. It` : "The cartoon character"} [action précise mouvement par mouvement]. Smooth animation, commercial quality, dynamic camera movement."
    }
  ]
}

STRUCTURE OBLIGATOIRE pour ${nScenes} scènes :
${structurePlan}

IMPORTANT :
- EXACTEMENT ${nScenes} scènes
- Chaque voiceover doit être une vraie phrase de copywriting qui vend
- Chaque voiceover doit durer environ ${durationPerScene} secondes à l'oral
- Le produit doit rester visuellement identique
- gemini_prompt doit toujours rappeler la description visuelle exacte`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Génère la pub pour "${product.name}". GÉNÈRE EXACTEMENT ${nScenes} SCÈNES — ni plus ni moins. Durée totale ${totalDuration}s. Structure AIDA adaptée à la durée. Voiceover qui vend vraiment.`,
        },
      ],
      temperature: 1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Réponse OpenAI vide" }, { status: 500 });
    }

    const script = JSON.parse(raw) as {
      duration?: string;
      productVisualDescription?: string;
      scenes?: Array<{
        gemini_prompt?: string;
        productVisualDescription?: string;
        grok_video_prompt?: string;
        video_prompt?: string;
        grok_prompt?: string;
        animation_prompt?: string;
        visual_description?: string;
        title?: string;
        character_action?: string;
      }>;
    };
    if (!script.scenes || script.scenes.length !== nScenes) {
      return NextResponse.json(
        {
          error: `Mauvais nombre de scènes (${script.scenes?.length ?? 0}/${nScenes})`,
        },
        { status: 422 }
      );
    }

    script.productVisualDescription =
      script.productVisualDescription || productVisualDescription;
    script.duration = script.duration || `${totalDuration}s`;
    script.scenes = script.scenes.map((scene) => {
      const currentPrompt = scene.gemini_prompt || "";
      const ensuredPrompt = currentPrompt.includes(productVisualDescription.slice(0, 24))
        ? currentPrompt
        : `${currentPrompt} THE PRODUCT must look EXACTLY like this: ${productVisualDescription}.`;
      const fixedGeminiPrompt =
        `${ensuredPrompt} ` +
        "VERTICAL 9:16 portrait format only. " +
        "ONE single product visible, NO duplicate products in background. " +
        "NO second product anywhere in the scene. " +
        "The product text and logo must be clearly readable. " +
        "Use a rich contextual environment related to the product, never a plain white or studio background.";
      const fixedVideoPrompt =
        (
          scene.grok_video_prompt ||
          scene.video_prompt ||
          scene.grok_prompt ||
          scene.animation_prompt ||
          `Pixar 3D animated commercial, vertical 9:16. ${
            scene.visual_description || scene.title || "Animated product scene"
          }. ${scene.character_action || ""}. Cinematic lighting, commercial quality.`
        ) +
        " Vertical 9:16 portrait. Single product only, no duplicates. Rich contextual background, never white or plain studio.";

      return {
        ...scene,
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
