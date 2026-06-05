import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import {
  buildImageSubjectPromptBlock,
  buildImageTemplatePromptBlock,
  normalizeImageTemplateKey,
} from "@/lib/adTemplates";
import {
  buildProductContextForBackground,
  resolveSceneBackground,
  sanitizeSceneDescription,
} from "@/lib/inferBackground";
import { requireCredits } from "@/lib/apiCredits";
import { analyzeProductImages } from "@/lib/productAnalysis";
import {
  buildInfluencerTraitsConstraintBlock,
  validateAndLogInfluencerTraits,
  type InfluencerTraits,
} from "@/lib/influencerAnalysis";

export const maxDuration = 120;

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image-preview";
const FALLBACK_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
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
      productName,
      productAnalysis: cachedAnalysis,
      productImages,
      packagingImage,
      influencerImage,
      influencerTraits: cachedInfluencerTraits,
      influencerMode,
      influencerBackgroundMode,
      template,
      targetAudience,
      sceneIndex,
      totalScenes,
      productType,
      storyTheme,
      theme,
      storyMode,
      wojakCharacterId,
      wojak_profile,
      characterImageBase64,
      characterMimeType,
    } = body as {
      scene?: SceneInput & {
        role?: string;
        subtitle_color?: string;
      };
      productDescription?: string;
      productName?: string;
      productAnalysis?: string;
      productImages?: ProductImageInput[];
      packagingImage?: PackagingImageInput;
      influencerImage?: InfluencerImageInput;
      influencerTraits?: InfluencerTraits | null;
      influencerMode?: "ai" | "photo";
      influencerBackgroundMode?: "keep" | "change";
      template?: string;
      targetAudience?: string;
      sceneIndex?: number;
      totalScenes?: number;
      productType?: "product" | "app";
      storyTheme?: string;
      theme?: string;
      storyMode?: boolean;
      wojakCharacterId?: string;
      wojak_profile?: string;
      characterImageBase64?: string;
      characterMimeType?: string;
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
        { error: "Service visuels PubMoi indisponible. Réessaie plus tard." },
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

    let influencerTraits: InfluencerTraits | null =
      cachedInfluencerTraits ?? null;

    if (hasInfluencerImage && influencerTraits) {
      validateAndLogInfluencerTraits(influencerTraits);
    } else if (hasInfluencerImage) {
      console.warn(
        "[IMAGES] Traits manquants — génération Pixar sans re-analyse serveur"
      );
    }

    const isApp = productType === "app";
    const resolvedStoryTheme =
      storyTheme || theme || (storyMode ? "wojak" : undefined);

    if (resolvedStoryTheme === "wojak") {
      const storyScene = scene || {};
      const sceneRole = resolveStorySceneRole(storyScene);
      const resolvedProductName =
        productName?.trim() || description.split(/[—–-]/)[0]?.trim() || "product";

      const parts = buildWojakGeminiParts({
        scene: storyScene,
        sceneRole,
        productImages: normalizedImages,
        isApp,
        productName: resolvedProductName,
      });

      const primaryModel =
        process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
      const models = [
        primaryModel,
        ...FALLBACK_IMAGE_MODELS.filter((m) => m !== primaryModel),
      ];

      const errors: string[] = [];
      for (const modelName of models) {
        try {
          console.log(
            "[IMAGES] Wojak corps complet — modèle:",
            modelName,
            "| acte:",
            sceneRole
          );
          const result = await generateImage(modelName, parts, {
            temperature: 0.3,
            topP: 0.8,
          });
          if (result) {
            const compressed = await compressForApiResponse(result);
            return NextResponse.json({ ...compressed, model: modelName });
          }
          errors.push(`${modelName}: pas d'image`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${modelName}: ${msg.slice(0, 200)}`);
        }
      }

      return NextResponse.json(
        {
          error:
            "Génération visuelle Wojak indisponible. " + errors.join(" | "),
        },
        { status: 500 }
      );
    }

    if (resolvedStoryTheme === "fruit-drama") {
      const storyAnalysis =
        cachedAnalysis?.trim() ||
        (isApp
          ? description
          : await analyzeProductImages(normalizedImages, description));

      const imagePrompt = buildStoryImagePrompt(
        scene || {},
        "fruit-drama",
        storyAnalysis || description,
        isApp,
        normalizedImages.length > 0
      );

      const parts = buildContentParts(
        normalizedImages,
        imagePrompt,
        packagingImage,
        null
      );

      const primaryModel =
        process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
      const models = [
        primaryModel,
        ...FALLBACK_IMAGE_MODELS.filter((m) => m !== primaryModel),
      ];

      const errors: string[] = [];
      for (const modelName of models) {
        try {
          console.log("[IMAGES] Story — modèle:", modelName, resolvedStoryTheme);
          const result = await generateImage(modelName, parts);
          if (result) {
            const compressed = await compressForApiResponse(result);
            return NextResponse.json({ ...compressed, model: modelName });
          }
          errors.push(`${modelName}: pas d'image`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${modelName}: ${msg.slice(0, 200)}`);
        }
      }

      return NextResponse.json(
        {
          error:
            "Génération visuelle History Ads indisponible. " + errors.join(" | "),
        },
        { status: 500 }
      );
    }

    const productContext = buildProductContextForBackground({
      description,
      analysis: productAnalysis || description,
    });
    const generatedBackground = isApp
      ? resolveSceneBackground(scene?.background, description)
      : resolveSceneBackground(scene?.background, productContext);

    const influencerContext = {
      isApp,
      appDescription: description,
      sceneBackground: generatedBackground,
    };

    const needsInfluencerPrompt =
      hasInfluencerImage ||
      templateKey === "influenceur" ||
      (isApp && influencerMode === "photo");

    const influencerInstruction = needsInfluencerPrompt
      ? buildInfluencerInstruction(
          hasInfluencerImage ? "photo" : influencerMode,
          hasInfluencerImage,
          keepInfluencerBackground,
          influencerTraits,
          influencerContext
        )
      : "";

    const imagePrompt = isApp
      ? buildAppImagePrompt(
          scene || {},
          description,
          normalizedImages.length > 0,
          influencerInstruction,
          keepInfluencerBackground,
          generatedBackground
        )
      : buildImagePrompt(
          scene || {},
          description,
          templateKey,
          productAnalysis,
          targetAudience,
          Boolean(packagingImage?.base64),
          influencerInstruction,
          keepInfluencerBackground,
          generatedBackground
        );
    console.log(
      "[IMAGES] Analyse forme:",
      (productAnalysis || description).slice(0, 120)
    );

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
    const pixarGenOpts = hasInfluencerImage
      ? { temperature: 1.0, topP: 0.95 }
      : undefined;

    const tryModels = async (attemptParts: ContentPart[]) => {
      for (const modelName of models) {
        try {
          console.log("[IMAGES] Modèle:", modelName);
          const result = await generateImage(
            modelName,
            attemptParts,
            pixarGenOpts
          );
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
    // modèles, on réessaie avec les traits extraits (sans la photo) pour garder
    // la même identité — jamais un personnage aléatoire par défaut.
    if (!attempt && hasInfluencerImage && influencerTraits) {
      console.warn(
        "[IMAGES] Refus avec photo influenceur — retry avec traits verrouillés"
      );
      const traitsOnlyInstruction = buildInfluencerInstruction(
        "photo",
        false,
        keepInfluencerBackground,
        influencerTraits,
        influencerContext
      );
      const fallbackPrompt = isApp
        ? buildAppImagePrompt(
            scene || {},
            description,
            normalizedImages.length > 0,
            traitsOnlyInstruction,
            keepInfluencerBackground,
            generatedBackground
          )
        : buildImagePrompt(
            scene || {},
            description,
            templateKey,
            productAnalysis,
            targetAudience,
            Boolean(packagingImage?.base64),
            templateKey === "influenceur" ? traitsOnlyInstruction : "",
            keepInfluencerBackground,
            generatedBackground
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
      const compressed = await compressForApiResponse(attempt.result);
      return NextResponse.json({
        ...compressed,
        model: attempt.model,
      });
    }

    return NextResponse.json(
      {
        error:
          "Génération visuelle PubMoi indisponible pour le moment. Réessaie. " +
          errors.join(" | "),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error(
      "[IMAGES] Erreur:",
      error instanceof Error ? error.message : "Erreur génération visuelle PubMoi"
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la génération des visuels PubMoi",
      },
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

function buildInfluencerBackgroundInstruction(
  keepBackground: boolean,
  generatedBackground: string
): string {
  if (keepBackground) {
    return `BACKGROUND: Reproduce the background from the reference photo but stylized in Pixar CGI style — same location but fully cartoon-rendered, same colors but Pixar-quality rendering. NOT a real photo background.`;
  }
  return `BACKGROUND: ${generatedBackground} — Pixar CGI quality, bright and vivid, matching the product/app universe`;
}

function buildInfluencerInstruction(
  influencerMode: "ai" | "photo" | undefined,
  hasInfluencerImage: boolean,
  keepBackground = false,
  traits: InfluencerTraits | null = null,
  context?: {
    isApp?: boolean;
    appDescription?: string;
    sceneBackground?: string;
  }
): string {
  const usePhotoReference =
    influencerMode === "photo" && (hasInfluencerImage || traits);

  if (usePhotoReference) {
    const traitsBlock = traits
      ? buildInfluencerTraitsConstraintBlock(traits)
      : "";

    const backgroundLine = buildInfluencerBackgroundInstruction(
      keepBackground,
      context?.sceneBackground || "modern lifestyle setting with warm Pixar lighting"
    );

    const poseBlock = context?.isApp
      ? `POSE AND FRAMING:
- Character faces camera directly, confident and friendly
- Holding a smartphone in one hand, screen facing camera
- The smartphone screen shows: ${context.appDescription || "the app interface"}
- Other hand pointing at the phone or giving thumbs up
- Framed from chest up, 9:16 vertical`
      : `POSE AND FRAMING:
- Character faces camera directly, confident and friendly
- Holding the promoted product prominently toward camera
- Direct eye contact with viewer — TikTok/UGC energy
- Framed from chest up, 9:16 vertical`;

    const referenceNote = hasInfluencerImage
      ? "The FIRST reference image is the uploaded photo — you MUST transform it, NOT return it."
      : "Use the locked traits below (extracted from the user's upload).";

    return `
TASK: Transform this real person photo into a Pixar 3D CGI animated character.
${referenceNote}

TRANSFORMATION RULES — NON-NEGOTIABLE:
- The output MUST be a Pixar 3D CGI illustration — NOT a real photo
- NOT photorealistic, NOT semi-realistic, NOT enhanced photo
- FULL Pixar animation style: Incredibles, Toy Story, Turning Red quality
- The person's face features must be recognizable but fully cartoon-stylized:
  * Larger expressive eyes (Pixar proportions)
  * Simplified smooth skin with Pixar shading
  * Slightly exaggerated features in cartoon style
  * Warm subsurface scattering light on skin

${traitsBlock}

WHAT TO KEEP FROM THE REFERENCE PHOTO:
- Same gender and approximate age
- Same hair color and general hair style
- Same skin tone (but rendered in Pixar style)
- Same facial structure recognizable to their friends
- If wearing glasses/jewelry/accessories → keep them in Pixar style

${poseBlock}

${backgroundLine}

ABSOLUTELY FORBIDDEN:
- Keeping the original photo as-is or only color-grading it
- Semi-realistic rendering or photographic skin/lighting
- Generating a random default character unrelated to the upload
- Changing gender, hair color, hair style, or skin tone
- Adding watermarks or text overlays

OUTPUT: A full Pixar 3D CGI illustration ready for a TikTok ad — 9:16 vertical.`;
  }

  return `
CHARACTER — AI GENERATED PIXAR:
Create an original stylized 3D Pixar human character.
Young, energetic, relatable. Large expressive Pixar cartoon eyes, smooth
glossy 3D CGI skin. NOT photorealistic — fully 3D animated movie look
(Toy Story / Luca). Holds the item being promoted, showing it to camera.
Looks directly at the viewer — TikTok/UGC energy.`;
}

async function compressForApiResponse(result: {
  imageBase64: string;
  mimeType: string;
  imageUrl: string;
}): Promise<{ imageBase64: string; mimeType: string; imageUrl: string }> {
  try {
    const buf = Buffer.from(result.imageBase64, "base64");
    const out = await sharp(buf)
      .resize(1080, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const b64 = out.toString("base64");
    console.log(
      "[IMAGES] Compressé:",
      Math.round(buf.length / 1024),
      "KB →",
      Math.round(out.length / 1024),
      "KB webp"
    );
    return {
      imageBase64: b64,
      mimeType: "image/webp",
      imageUrl: `data:image/webp;base64,${b64}`,
    };
  } catch (err) {
    console.warn(
      "[IMAGES] Compression échouée:",
      err instanceof Error ? err.message : err
    );
    return result;
  }
}

async function generateImage(
  modelName: string,
  parts: ContentPart[],
  options?: { temperature?: number; topP?: number }
): Promise<{ imageBase64: string; mimeType: string; imageUrl: string } | null> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: options?.temperature ?? 1.0,
      ...(options?.topP != null ? { topP: options.topP } : {}),
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

function buildBackgroundMandatoryBlock(background: string): string {
  return `
━━━ BACKGROUND — MANDATORY ━━━
The background MUST be: ${background}

This specific environment is NON-NEGOTIABLE.
Do NOT use a living room, salon, or neutral/plain background.
Do NOT use a white or grey studio background.
The character/product must be placed IN this exact environment.
The background must be visible and contextually relevant to the product.
Minimum 15 words of environmental detail must be readable in the scene.`;
}

function buildImagePrompt(
  scene: SceneInput,
  productDescription: string,
  templateKey: ReturnType<typeof normalizeImageTemplateKey>,
  productAnalysis: string,
  targetAudience?: string,
  hasPackaging?: boolean,
  influencerInstruction?: string,
  keepInfluencerBackground = false,
  generatedBackground?: string
): string {
  const analysis =
    productAnalysis?.trim() || productDescription?.trim() || "See reference photos";
  const productContext = buildProductContextForBackground({
    description: productDescription,
    analysis,
  });
  const sceneBg =
    generatedBackground ||
    resolveSceneBackground(scene.background, productContext);
  const background = keepInfluencerBackground
    ? buildInfluencerBackgroundInstruction(true, sceneBg)
    : sceneBg;
  const sceneDesc = sanitizeSceneDescription(
    scene.visual_description || scene.description || "",
    background
  );
  const narrativeRole = scene.narrative_role || "solution";
  const backgroundBlock = buildBackgroundMandatoryBlock(background);

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
${backgroundBlock}

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
- Pixar "Toy Story 4" / Turning Red quality 3D CGI — NEVER photorealistic
- Subsurface scattering on all surfaces — cartoon skin, NOT photo skin
- Colors: VIBRANT and OVERSATURATED — 40% more vivid than reality
- Lighting: ${mood} — must match the mandatory background environment
- Smooth 3D surfaces with Pixar-quality textures
- Depth of field bokeh on background elements
- NOT flat 2D, NOT semi-realistic, NOT a filtered photograph

━━━ SCENE ━━━
${sceneDesc}
Setting: ${background}

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
  keepInfluencerBackground = false,
  generatedBackground?: string
): string {
  const sceneDesc = scene.visual_description || scene.description || "";
  const sceneBg =
    generatedBackground ||
    resolveSceneBackground(scene.background, appDescription);
  const background = keepInfluencerBackground
    ? buildInfluencerBackgroundInstruction(true, sceneBg)
    : sceneBg;
  const backgroundBlock = buildBackgroundMandatoryBlock(background);
  const mouthExpr = scene.mouth_expression || mouthHintForEmotion(scene.emotion);
  const hasInfluencerPhoto = Boolean(influencerInstruction);

  return `Create a Pixar/DreamWorks 3D CGI advertisement image.
${backgroundBlock}

MANDATORY STYLE: the image MUST be a fully 3D ANIMATED Pixar/DreamWorks CGI
render (Incredibles / Turning Red quality) — NEVER a photograph, NEVER
photorealistic, NEVER semi-realistic. If a reference photo is provided, you
MUST cartoon-stylize the person completely — NOT return an enhanced photo.

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
Setting: ${background}

━━━ CHARACTER ━━━
${
  hasInfluencerPhoto
    ? "- FULL Pixar 3D CGI cartoon derived from the uploaded reference — SAME gender, hair, face structure, skin tone (see TASK above). Big exaggerated Pixar eyes, smooth glossy cartoon skin. NOT a photo. NOT a random character."
    : "- Stylized 3D Pixar human character with big cartoon eyes and glossy CGI skin"
}
- Faces camera directly, confident and friendly
- Holds smartphone in one hand, screen facing camera${hasScreenshots ? " (UI from screenshots above)" : ""}
- Other hand pointing at phone or thumbs up
- Chest-up framing, TikTok/UGC presenter energy
- Mouth expression: ${mouthExpr}

━━━ SMARTPHONE ━━━
- Modern iPhone/Android style, slightly oversized Pixar proportions
- Screen is bright, clearly visible, showing the app UI
- Screen glow creates natural lighting on the character's face

━━━ PIXAR STYLE ━━━
- Pixar "Toy Story 4" quality 3D CGI — NOT photorealistic, NOT flat 2D
- Subsurface scattering, vibrant oversaturated colors, rim lighting
- Depth of field bokeh on background elements

━━━ FORMAT ━━━
Vertical 9:16 — character and smartphone clearly framed, cinematic lighting.`;
}

type StorySceneInput = {
  id?: number;
  role?: string;
  narrative_role?: string;
  show_product?: boolean;
  character_pose?: string;
  subtitle?: string;
  subtitle_color?: string;
  visual_description?: string;
  background?: string;
};

const WOJAK_STYLE_REF = "gym_wojak.png";

const WOJAK_FACE_DESCRIPTION = `
FACE — COPY EXACTLY FROM THE REFERENCE IMAGE:
The face must be pixel-perfect identical to the reference:
- Completely BALD head — no hair at all
- Skin color: off-white / very light grey — like unpainted plaster
- Head shape: slightly elongated oval, rounded top
- Eyes: TWO small, simple, droopy eyes — heavy eyelids, looking slightly downward
  Each eye is just a small curved line with a tiny iris dot — NOT big anime eyes
- Eyebrows: thin, slightly furrowed, angled inward — giving a tired/sad expression
- Nose: a simple small bump or two tiny dots — minimalist
- Mouth: a straight thin line, slightly downturned at corners — neutral or sad
- Chin: slightly pronounced, rounded
- Neck: short and thick
- No shading on face — flat white/grey fill with simple black outlines only
- The face looks like it was drawn in MS Paint or with a basic pencil sketch
- Style reference: the "Wojak" / "NPC" internet meme face — NOT anime, NOT manga, NOT Pixar
- Do NOT draw big eyes, do NOT draw detailed facial features, do NOT add hair
`.trim();

type WojakActConfig = {
  outfit: string;
  pose: string;
  background: string;
  product: string;
};

function resolveStorySceneRole(scene: StorySceneInput): string {
  const role = scene.role || scene.narrative_role || "problem";
  if (role === "solution") return "solution";
  if (role === "discovery") return "discovery";
  return "problem";
}

function resolveSceneActId(scene: StorySceneInput, sceneRole: string): number {
  if (typeof scene.id === "number" && scene.id >= 1 && scene.id <= 3) {
    return scene.id;
  }
  if (sceneRole === "solution") return 3;
  if (sceneRole === "discovery") return 2;
  return 1;
}

function buildWojakActConfig(
  scene: StorySceneInput,
  sceneRole: string,
  isApp: boolean,
  productName: string
): WojakActConfig {
  const envBase =
    scene.visual_description ||
    scene.background ||
    "realistic indoor room";

  const poseOverride = scene.character_pose?.trim();

  const actConfigs: Record<string, WojakActConfig> = {
    problem: {
      outfit: "oversized black hoodie, grey sweatpants",
      pose:
        poseOverride ||
        "standing hunched, shoulders slumped, hands in pocket, head slightly down",
      background: `${envBase}, dark cold blue/grey lighting, cluttered messy space, shadows`,
      product: "NO product in this scene",
    },
    discovery: {
      outfit: "same black hoodie, casual",
      pose:
        poseOverride ||
        "sitting on couch edge, leaning forward, holding phone in one hand, looking at it with curiosity",
      background: `${envBase}, neutral evening light, warm lamp glow starting`,
      product: "NO product — only phone in hand",
    },
    solution: {
      outfit: "clean white t-shirt or light grey hoodie, standing tall",
      pose:
        poseOverride ||
        (isApp
          ? "standing straight and confident, holding smartphone with both hands facing camera at chest height"
          : "standing straight and confident, holding the product with both hands facing camera at chest height"),
      background: `${envBase}, warm golden light, bright clean organized space`,
      product: isApp
        ? `Smartphone showing "${productName}" app UI held clearly facing camera — reference screenshots provided — the HERO of the scene`
        : "Product held clearly facing camera — same colors and shape as reference photos — the HERO of the scene",
    },
  };

  return actConfigs[sceneRole] || actConfigs.problem;
}

function loadWojakStyleRefBase64(): string {
  const styleRefPath = path.join(
    process.cwd(),
    "public",
    "wojak",
    WOJAK_STYLE_REF
  );
  if (!fs.existsSync(styleRefPath)) {
    throw new Error(
      `Référence Wojak introuvable: public/wojak/${WOJAK_STYLE_REF}`
    );
  }
  return fs.readFileSync(styleRefPath).toString("base64");
}

function buildWojakGeminiParts(opts: {
  scene: StorySceneInput;
  sceneRole: string;
  productImages: { base64: string; mimeType: string }[];
  isApp: boolean;
  productName: string;
}): ContentPart[] {
  const actId = resolveSceneActId(opts.scene, opts.sceneRole);
  const cfg = buildWojakActConfig(
    opts.scene,
    opts.sceneRole,
    opts.isApp,
    opts.productName
  );

  const wojakRefBase64 = loadWojakStyleRefBase64();
  console.log(
    "[IMAGES] Wojak — référence style réinjectée acte",
    actId,
    ":",
    WOJAK_STYLE_REF
  );

  const parts: ContentPart[] = [
    {
      inlineData: {
        mimeType: "image/png",
        data: wojakRefBase64,
      },
    },
  ];

  if (opts.sceneRole === "solution" && opts.productImages.length > 0) {
    for (const img of opts.productImages.slice(0, 2)) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.base64,
        },
      });
    }
    console.log(
      "[IMAGES] Wojak acte 3 —",
      Math.min(opts.productImages.length, 2),
      "photo(s) produit en référence"
    );
  }

  const productBlock =
    opts.sceneRole === "solution"
      ? `PRODUCT:
- Character holds the product with both hands, facing camera
- Product clearly visible at chest height
- ${cfg.product}`
      : "NO product in this scene";

  const prompt = `
REFERENCE IMAGE (first image): Study this character carefully.
You must reproduce THE EXACT SAME face on the character you generate.

${WOJAK_FACE_DESCRIPTION}

BODY — same style as reference:
- Full body visible head to toe
- Flat 2D illustration style with simple black outlines
- White/light grey skin on body
- Simple flat clothing — no gradients, no textures
- Character height: 65-75% of image

THIS SCENE — ACT ${actId}:
- Outfit: ${cfg.outfit}
- Pose: ${cfg.pose}

BACKGROUND:
- ${cfg.background}
- PHOTORÉALISTIC — like a real photograph
- Strong contrast between sketch character and real photo background

${productBlock}

FORBIDDEN:
- Big anime/manga eyes
- Hair on the head
- Realistic human face
- 3D render or Pixar style
- Illustrated/cartoon background
- Body cut at waist — must show full body
- Any text or subtitles in the image
`.trim();

  parts.push({ text: prompt });
  return parts;
}

function buildStoryImagePrompt(
  scene: StorySceneInput,
  theme: string,
  productAnalysis: string,
  isApp: boolean,
  hasAppScreenshots: boolean
): string {
  const productInHands = isApp
    ? `The character holds a modern smartphone facing the camera.
       The phone screen shows the app interface clearly.
       ${hasAppScreenshots ? "Reference screenshots provided above — reproduce the UI on the screen." : ""}
       Screen is bright, UI is readable and prominent.`
    : `The character holds the physical product in their hands.
       Product: ${productAnalysis}
       Product is clearly visible, facing camera, recognizable.
       Same colors, shape, and details as the reference photos.`;

  const isSceneSolution = scene.role === "solution";

  return `
Create a Pixar/DreamWorks quality 3D CGI cinematic image — Fruit Drama style.

MANDATORY FRUIT DRAMA STYLE:
- Characters have FRUIT HEADS on full realistic HUMAN BODIES
- Fruit heads: large Pixar expressive eyes, detailed fruit texture
- Bodies: human proportions, detailed realistic clothing
- Background: PHOTORÉALISTIC cinematic environment
- Lighting: dramatic, moody, cinematic — like a movie still
- Quality: Pixar "Coco" / "Ratatouille" level

SCENE: ${scene.visual_description || ""}
BACKGROUND: ${scene.background || ""}

${
  isSceneSolution
    ? `
PRODUCT/APP IN SCENE (MANDATORY):
${productInHands}
The fruit character holds this in their hands — clearly visible, facing camera.
This is the SOLUTION scene — the product/app is the hero of this frame.
`
    : `
This is the SETUP scene — dramatic tension between characters.
Product is visible in the background or environment, not yet in hands.
`
}

SUBTITLE: "${scene.subtitle || ""}" — simple bold white text at the bottom

Vertical 9:16 format, cinematic composition`;
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
