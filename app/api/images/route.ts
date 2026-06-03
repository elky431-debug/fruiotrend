import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildImageSubjectPromptBlock,
  buildImageTemplatePromptBlock,
  normalizeImageTemplateKey,
} from "@/lib/adTemplates";
import { inferBackground } from "@/lib/inferBackground";
import { requireCredits } from "@/lib/apiCredits";
import { analyzeProductImages } from "@/lib/productAnalysis";

export const maxDuration = 120;

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const FALLBACK_IMAGE_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image-preview",
];

type ProductImageInput =
  | string
  | {
      base64?: string;
      mimeType?: string;
      url?: string;
    };

type PackagingImageInput = {
  base64?: string;
  mimeType?: string;
  url?: string;
} | null;

type InfluencerImageInput = {
  base64?: string;
  mimeType?: string;
  url?: string;
} | null;

type SceneInput = {
  visual_description?: string;
  description?: string;
  subtitle?: string;
  emotion?: string;
  gemini_prompt?: string;
  background?: string;
  narrative_role?: string;
  mouth_expression?: string;
};

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const regenerate = Boolean((body as { regenerate?: boolean }).regenerate);
    const creditGuard = await requireCredits(req, "image", { regenerate });
    if (creditGuard instanceof NextResponse) return creditGuard;

    const {
      scene,
      productDescription,
      productAnalysis: cachedAnalysis,
      productImages,
      packagingImage,
      influencerImage,
      influencerMode,
      influencerBackgroundMode,
      template,
      targetAudience,
      sceneIndex,
      totalScenes,
      productType,
    } = body as {
      scene?: SceneInput;
      productDescription?: string;
      productAnalysis?: string;
      productImages?: ProductImageInput[];
      packagingImage?: PackagingImageInput;
      influencerImage?: InfluencerImageInput;
      influencerMode?: "ai" | "photo";
      influencerBackgroundMode?: "keep" | "change";
      template?: string;
      targetAudience?: string;
      sceneIndex?: number;
      totalScenes?: number;
      productType?: "product" | "app";
    };

    console.log(
      "[IMAGES] Génération scène",
      typeof sceneIndex === "number" ? sceneIndex + 1 : "?",
      "/",
      totalScenes ?? "?",
      "— template:",
      template
    );

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY manquante" },
        { status: 500 }
      );
    }

    const normalizedImages = normalizeProductImages(productImages);
    const description = productDescription?.trim() || "";

    const productAnalysis =
      productType === "app"
        ? ""
        : cachedAnalysis?.trim() ||
          (await analyzeProductImages(normalizedImages, description));

    const templateKey = normalizeImageTemplateKey(template);
    console.log(
      "[IMAGES] Template reçu:",
      template,
      "→ normalisé:",
      templateKey
    );

    const hasInfluencerImage =
      influencerMode === "photo" && Boolean(influencerImage?.base64);

    const keepInfluencerBackground =
      hasInfluencerImage && influencerBackgroundMode === "keep";

    const isApp = productType === "app";

    const imagePrompt = isApp
      ? buildAppImagePrompt(
          scene || {},
          description,
          normalizedImages.length > 0,
          hasInfluencerImage
            ? buildInfluencerInstruction("photo", true, keepInfluencerBackground)
            : "",
          keepInfluencerBackground
        )
      : buildImagePrompt(
          scene || {},
          description,
          templateKey,
          productAnalysis,
          targetAudience,
          Boolean(packagingImage?.base64),
          templateKey === "influenceur"
            ? buildInfluencerInstruction(
                influencerMode,
                hasInfluencerImage,
                keepInfluencerBackground
              )
            : "",
          keepInfluencerBackground
        );
    console.log("[IMAGES] Analyse forme:", productAnalysis.substring(0, 120));

    const parts = buildContentParts(
      normalizedImages,
      imagePrompt,
      packagingImage,
      hasInfluencerImage ? influencerImage : null
    );

    const primaryModel =
      process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
    const models = [
      primaryModel,
      ...FALLBACK_IMAGE_MODELS.filter((m) => m !== primaryModel),
    ];

    const errors: string[] = [];

    // Essaie chaque modèle ; renvoie {result, model} ou null si aucun n'a
    // produit d'image (refus de sécurité, IMAGE_OTHER, etc.).
    const tryModels = async (attemptParts: ContentPart[]) => {
      for (const modelName of models) {
        try {
          console.log("[IMAGES] Modèle:", modelName);
          const result = await generateImage(modelName, attemptParts);
          if (result) return { result, model: modelName };
          errors.push(`${modelName}: pas d'image dans la réponse`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const is404 = msg.includes("404") || msg.includes("not found");
          console.warn("[IMAGES] Échec", modelName, ":", msg.slice(0, 120));
          errors.push(`${modelName}: ${msg.slice(0, 200)}`);
          if (!is404) break;
        }
      }
      return null;
    };

    let attempt = await tryModels(parts);

    // Filet de sécurité : si la photo influenceur a fait refuser tous les
    // modèles, on régénère un personnage générique (sans la photo) pour ne
    // jamais bloquer l'utilisateur.
    if (!attempt && hasInfluencerImage) {
      console.warn(
        "[IMAGES] Refus avec photo influenceur — fallback personnage générique"
      );
      const fallbackPrompt = isApp
        ? buildAppImagePrompt(
            scene || {},
            description,
            normalizedImages.length > 0,
            "",
            false
          )
        : buildImagePrompt(
            scene || {},
            description,
            templateKey,
            productAnalysis,
            targetAudience,
            Boolean(packagingImage?.base64),
            templateKey === "influenceur"
              ? buildInfluencerInstruction("ai", false)
              : "",
            false
          );
      const fallbackParts = buildContentParts(
        normalizedImages,
        fallbackPrompt,
        packagingImage,
        null
      );
      attempt = await tryModels(fallbackParts);
    }

    if (attempt) {
      console.log(
        "[IMAGES] ✅ 1 image — scène",
        typeof sceneIndex === "number" ? sceneIndex + 1 : "?",
        "via",
        attempt.model
      );
      return NextResponse.json({
        ...attempt.result,
        model: attempt.model,
      });
    }

    return NextResponse.json(
      {
        error:
          "Aucun modèle Gemini image disponible. Vérifie GEMINI_API_KEY et réessaie. " +
          errors.join(" | "),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error(
      "[IMAGES] Erreur:",
      error instanceof Error ? error.message : "Erreur Gemini"
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur Gemini" },
      { status: 500 }
    );
  }
}

function normalizeProductImages(
  productImages: ProductImageInput[] | undefined
): { base64: string; mimeType: string }[] {
  if (!productImages?.length) return [];

  const out: { base64: string; mimeType: string }[] = [];
  for (const img of productImages.slice(0, 3)) {
    if (typeof img === "string") {
      out.push({ base64: img, mimeType: "image/jpeg" });
      continue;
    }
    if (img.base64) {
      out.push({
        base64: img.base64,
        mimeType: img.mimeType || "image/jpeg",
      });
    }
  }
  return out;
}

function buildContentParts(
  productImages: { base64: string; mimeType: string }[],
  imagePrompt: string,
  packagingImage?: PackagingImageInput,
  influencerImage?: InfluencerImageInput
): ContentPart[] {
  const parts: ContentPart[] = [];

  if (influencerImage?.base64) {
    parts.push({
      inlineData: {
        mimeType: influencerImage.mimeType || "image/jpeg",
        data: influencerImage.base64,
      },
    });
    console.log("[IMAGES] Photo influenceur ajoutée en référence principale");
  }

  for (const img of productImages.slice(0, 2)) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  if (packagingImage?.base64) {
    parts.push({
      inlineData: {
        mimeType: packagingImage.mimeType || "image/jpeg",
        data: packagingImage.base64,
      },
    });
    console.log("[IMAGES] Packaging ajouté comme référence visuelle");
  }

  parts.push({ text: imagePrompt });
  return parts;
}

function buildInfluencerInstruction(
  influencerMode: "ai" | "photo" | undefined,
  hasInfluencerImage: boolean,
  keepBackground = false
): string {
  if (influencerMode === "photo" && hasInfluencerImage) {
    const backgroundLine = keepBackground
      ? "BACKGROUND: keep the EXACT same setting / room / decor / lighting as the reference image, re-rendered in Pixar 3D CGI style. Do NOT invent a new environment."
      : "BACKGROUND: place the character in the scene environment described below, fully rendered in Pixar 3D CGI (modern lifestyle, warm lighting, bokeh).";
    return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
THIS IS NOT A PHOTO — THIS IS A PIXAR 3D CGI ANIMATION
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

The reference image above shows a person.
Transform this person into an ORIGINAL Pixar/DreamWorks 3D CGI animated
character. The output MUST look like a frame from a Pixar movie — NOT a photo.

TRANSFORMATION RULES:
1. STYLE: Full Pixar 3D CGI render — smooth glossy skin, subsurface scattering, cartoon proportions
2. EYES: Make the eyes significantly larger and more expressive (Pixar style)
3. SKIN: Keep the same skin tone but render it in smooth Pixar 3D texture
4. HAIR: Keep the same hair color, length and style — rendered in Pixar 3D
5. FACE: Keep the facial features but stylize them — rounder, softer, more expressive
6. OUTFIT: Keep the same clothing colors and style, rendered in Pixar 3D
7. ACCESSORIES: Keep all jewelry, hats and accessories — rendered in Pixar 3D

WHAT THE CHARACTER DOES:
- Holds the item being promoted (product or a smartphone showing the app), to camera
- Direct eye contact with viewer — TikTok/UGC energy
- Enthusiastic, friendly expression

THIS IS MANDATORY:
- The output is a 3D Pixar CGI image — NOT a photo
- NOT realistic — NOT photorealistic — PIXAR ANIMATED
- Think: how would Pixar animate this kind of character in their movie?

FORBIDDEN:
❌ Outputting a realistic photo or photo-realistic render
❌ Keeping the reference image as-is or only lightly filtered
❌ Changing the skin tone
❌ Removing accessories or distinctive features
❌ Flat 2D drawing or anime — it MUST be 3D CGI Pixar style

${backgroundLine}
VERTICAL 9:16 portrait format.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
  }

  return `
CHARACTER — AI GENERATED PIXAR:
Create an original stylized 3D Pixar human character.
Young, energetic, relatable. Large expressive Pixar cartoon eyes, smooth
glossy 3D CGI skin. NOT photorealistic — fully 3D animated movie look
(Toy Story / Luca). Holds the item being promoted, showing it to camera.
Looks directly at the viewer — TikTok/UGC energy.`;
}

async function generateImage(
  modelName: string,
  parts: ContentPart[]
): Promise<{ imageBase64: string; mimeType: string; imageUrl: string } | null> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 1.0,
      imageConfig: { aspectRatio: "9:16" },
    } as never,
  });

  const candidate = result.response.candidates?.[0];
  const responseParts = candidate?.content?.parts || [];

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const imageBase64 = part.inlineData.data;
      return {
        imageBase64,
        mimeType,
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
      };
    }
  }

  const refusalText = responseParts
    .map((p) => p.text)
    .filter(Boolean)
    .join(" ")
    .trim();
  const finishReason = candidate?.finishReason;
  if (refusalText || finishReason) {
    console.warn(
      "[IMAGES] Réponse sans image —",
      "finishReason:",
      finishReason,
      "| texte:",
      refusalText.slice(0, 200)
    );
  }

  return null;
}

function buildShapeMandatoryBlock(analysis: string): string {
  return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
PRODUCT SHAPE IS MANDATORY — READ THIS FIRST:
${analysis}

YOU MUST REPRODUCE THIS EXACT SHAPE.
IF THE PRODUCT IS T-SHAPED → DRAW A T-SHAPE.
IF THE PRODUCT IS CYLINDRICAL → DRAW A CYLINDER.
DO NOT INVENT A DIFFERENT SHAPE.
DO NOT SIMPLIFY THE SHAPE.
THE SHAPE IN YOUR OUTPUT MUST MATCH THE REFERENCE PHOTO.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
}

function buildShapeFinalCheckBlock(analysis: string): string {
  return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
FINAL CHECK: Does your output show the EXACT shape from the reference?
${analysis}
If not → START OVER.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
}

function buildImagePrompt(
  scene: SceneInput,
  productDescription: string,
  templateKey: ReturnType<typeof normalizeImageTemplateKey>,
  productAnalysis: string,
  targetAudience?: string,
  hasPackaging?: boolean,
  influencerInstruction?: string,
  keepInfluencerBackground = false
): string {
  const sceneDesc = scene.visual_description || scene.description || "";
  const analysis =
    productAnalysis?.trim() || productDescription?.trim() || "See reference photos";
  const background = keepInfluencerBackground
    ? "Keep the EXACT same background / setting as the reference influencer photo (same room, decor, lighting), re-rendered in Pixar 3D CGI style. Do NOT invent a new environment."
    : scene.background?.trim() || inferBackground(productDescription);
  const narrativeRole = scene.narrative_role || "solution";

  const packagingInstruction = hasPackaging
    ? `
━━━ PACKAGING HELD BY CHARACTER ━━━
The product character is holding its packaging in one hand/appendage.
The packaging image is provided in the reference above — reproduce it EXACTLY:
- Same colors, same logo, same shape of the package
- The packaging is clearly visible and readable
- The character holds it proudly, showing it to the viewer
- Like the Courtx insole character holding its blue package
`
    : "";

  const moodByRole: Record<string, string> = {
    problem:
      "dark moody atmosphere, desaturated colors, dim lighting, emotional heaviness",
    discovery:
      "mysterious spotlight emerging from darkness, hopeful warm light beginning",
    solution:
      "vibrant bright colors, triumphant lighting, energy and optimism, vivid saturation",
  };
  const mood = moodByRole[narrativeRole] || moodByRole.solution;
  const mouthExpr = scene.mouth_expression || mouthHintForEmotion(scene.emotion);

  const templateBlock = buildImageTemplatePromptBlock(
    templateKey,
    analysis,
    sceneDesc,
    targetAudience
  );
  const subjectBlock = buildImageSubjectPromptBlock(templateKey, {
    emotion: scene.emotion,
    mouthExpr,
    productAnalysis: analysis,
  });

  const formatHint =
    templateKey === "demo-produit"
      ? "Vertical 9:16 — product fills frame, cinematic close-up, product ~60% of frame height"
      : templateKey === "influenceur"
        ? "Vertical 9:16 — influencer holds product, UGC framing, face visible"
        : "Vertical 9:16 portrait — living product hero center stage, product ~60% of frame height";

  const shapeBlock = buildShapeMandatoryBlock(analysis);
  const finalCheck = buildShapeFinalCheckBlock(analysis);

  return `${shapeBlock}

Create a Pixar/DreamWorks 3D CGI advertisement image.

━━━ PRODUCT REFERENCE ━━━
Reference photos are provided above. The product is:
${analysis}

CRITICAL FIDELITY RULES:
- IDENTICAL shape — every part, every proportion
- IDENTICAL colors — main color + ALL accent colors
- IDENTICAL distinctive details (rings, logos, LEDs, buttons)
- If unsure about any detail → look at the reference photo again
- The product must be 100% recognizable to someone who owns it

━━━ TEMPLATE ACTIF : ${templateKey.toUpperCase()} ━━━
${templateBlock}
${influencerInstruction || ""}

${subjectBlock}

${packagingInstruction}

━━━ PIXAR STYLE ━━━
- Pixar "Toy Story 4" quality 3D CGI — NOT photorealistic, NOT dark cinematic
- Subsurface scattering on all surfaces
- Colors: VIBRANT and OVERSATURATED — 40% more vivid than reality
- Lighting: ${mood}
- Smooth 3D surfaces with Pixar-quality textures
- Depth of field bokeh on background elements
- NOT flat, NOT cartoon 2D, NOT dark

━━━ BACKGROUND ━━━
${background}
- Rich contextual environment — NEVER white or plain
- ${mood}

━━━ SCENE ━━━
${sceneDesc}

━━━ FORMAT ━━━
${formatHint}

${finalCheck}
`;
}

function buildAppImagePrompt(
  scene: SceneInput,
  appDescription: string,
  hasScreenshots: boolean,
  influencerInstruction = "",
  keepInfluencerBackground = false
): string {
  const sceneDesc = scene.visual_description || scene.description || "";
  const background = keepInfluencerBackground
    ? "Keep the EXACT same background / setting as the reference influencer photo (same room, decor, lighting), re-rendered in Pixar 3D CGI style. Do NOT invent a new environment."
    : scene.background?.trim() || inferBackground(appDescription);
  const mouthExpr = scene.mouth_expression || mouthHintForEmotion(scene.emotion);
  const hasInfluencerPhoto = Boolean(influencerInstruction);

  return `Create a Pixar/DreamWorks 3D CGI advertisement image.

MANDATORY STYLE: the image MUST be a fully 3D ANIMATED Pixar/DreamWorks CGI
render (Toy Story / Luca look) — NEVER a photograph, NEVER photorealistic.
The character is a 3D cartoon, even when inspired by a reference photo.

THIS IS AN APP ADVERTISEMENT — NOT a physical product.

APP: ${appDescription}
${
  hasScreenshots
    ? `
━━━ APP INTERFACE REFERENCE ━━━
The ${hasInfluencerPhoto ? "LAST reference image(s)" : "screenshots provided above"} show the real app interface.
Reproduce this UI faithfully on the smartphone screen — same layout, colors and key elements.`
    : ""
}
${influencerInstruction}

━━━ SCENE ━━━
${sceneDesc}

━━━ CHARACTER ━━━
${
  hasInfluencerPhoto
    ? "- An ORIGINAL 3D PIXAR CARTOON presenter (NOT photorealistic, NOT a photo), using the FIRST reference image only as art-direction inspiration for the general look (hair color/style, skin tone, outfit colors). Big exaggerated Pixar eyes, smooth glossy 3D CGI skin. A fictional animated mascot, not a real person."
    : "- Stylized 3D Pixar human character with big cartoon eyes and glossy CGI skin"
}
- Holds a smartphone in both hands (or one hand), facing camera
- The smartphone screen shows the app interface${hasScreenshots ? " matching the screenshots above" : ""}
- Character looks enthusiastic, direct eye contact with the viewer
- TikTok/UGC presenter energy
- Mouth expression: ${mouthExpr}

━━━ SMARTPHONE ━━━
- Modern iPhone/Android style, slightly oversized Pixar proportions
- Screen is bright, clearly visible, showing the app UI
- Screen glow creates natural lighting on the character's face

━━━ PIXAR STYLE ━━━
- Pixar "Toy Story 4" quality 3D CGI — NOT photorealistic, NOT flat 2D
- Subsurface scattering, vibrant oversaturated colors, rim lighting
- Depth of field bokeh on background elements

━━━ BACKGROUND ━━━
${background}
- Rich contextual environment matching the app use case — NEVER white or plain

━━━ FORMAT ━━━
Vertical 9:16 — character and smartphone clearly framed, cinematic lighting.`;
}

function mouthHintForEmotion(emotion?: string): string {
  const map: Record<string, string> = {
    excited: "big wide smile showing teeth",
    happy: "big wide smile",
    triumphant: "confident wide smile",
    dramatic: "slightly open mouth mid-speech",
    intense: "determined smirk",
    empathy: "soft concerned mouth",
    mysterious: "subtle knowing smile",
    intimate: "gentle whispering mouth",
    whisper: "soft open mouth speaking quietly",
  };
  return map[emotion || ""] || "open mouth speaking naturally";
}
