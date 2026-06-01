import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildImageSubjectPromptBlock,
  buildImageTemplatePromptBlock,
  normalizeImageTemplateKey,
} from "@/lib/adTemplates";
import { inferBackground } from "@/lib/inferBackground";
import { analyzeProductImages } from "@/lib/productAnalysis";

export const maxDuration = 120;

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const FALLBACK_IMAGE_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
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
    const {
      scene,
      productDescription,
      productAnalysis: cachedAnalysis,
      productImages,
      packagingImage,
      template,
      targetAudience,
      sceneIndex,
      totalScenes,
    } = body as {
      scene?: SceneInput;
      productDescription?: string;
      productAnalysis?: string;
      productImages?: ProductImageInput[];
      packagingImage?: PackagingImageInput;
      template?: string;
      targetAudience?: string;
      sceneIndex?: number;
      totalScenes?: number;
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
      cachedAnalysis?.trim() ||
      (await analyzeProductImages(normalizedImages, description));

    const templateKey = normalizeImageTemplateKey(template);
    console.log(
      "[IMAGES] Template reçu:",
      template,
      "→ normalisé:",
      templateKey
    );

    const imagePrompt = buildImagePrompt(
      scene || {},
      description,
      templateKey,
      productAnalysis,
      targetAudience,
      Boolean(packagingImage?.base64)
    );
    console.log("[IMAGES] Analyse forme:", productAnalysis.substring(0, 120));

    const parts = buildContentParts(
      normalizedImages,
      imagePrompt,
      packagingImage
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
        console.log("[IMAGES] Modèle:", modelName);
        const result = await generateImage(modelName, parts);
        if (result) {
          console.log(
            "[IMAGES] ✅ 1 image — scène",
            typeof sceneIndex === "number" ? sceneIndex + 1 : "?",
            "via",
            modelName
          );
          return NextResponse.json({
            ...result,
            model: modelName,
          });
        }
        errors.push(`${modelName}: pas d'image dans la réponse`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const is404 = msg.includes("404") || msg.includes("not found");
        console.warn("[IMAGES] Échec", modelName, ":", msg.slice(0, 120));
        errors.push(`${modelName}: ${msg.slice(0, 200)}`);
        if (!is404) break;
      }
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
  packagingImage?: PackagingImageInput
): ContentPart[] {
  const parts: ContentPart[] = [];

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
      temperature: 0.65,
      imageConfig: { aspectRatio: "9:16" },
    } as never,
  });

  const responseParts =
    result.response.candidates?.[0]?.content?.parts || [];

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
  hasPackaging?: boolean
): string {
  const sceneDesc = scene.visual_description || scene.description || "";
  const analysis =
    productAnalysis?.trim() || productDescription?.trim() || "See reference photos";
  const background =
    scene.background?.trim() || inferBackground(productDescription);
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
