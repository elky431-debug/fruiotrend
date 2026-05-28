import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
      template,
      sceneIndex,
      totalScenes,
    } = body as {
      scene?: SceneInput;
      productDescription?: string;
      productAnalysis?: string;
      productImages?: ProductImageInput[];
      template?: string;
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

    const imagePrompt = buildImagePrompt(
      scene || {},
      description,
      template || "",
      productAnalysis
    );
    console.log("[IMAGES] Prompt:", imagePrompt.substring(0, 120));

    const parts = buildContentParts(normalizedImages, imagePrompt);

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
  imagePrompt: string
): ContentPart[] {
  const parts: ContentPart[] = [];

  for (const img of productImages) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
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

function buildImagePrompt(
  scene: SceneInput,
  productDescription: string,
  template: string,
  productAnalysis: string
): string {
  const sceneDesc = scene.visual_description || scene.description || "";
  const analysis =
    productAnalysis?.trim() || productDescription?.trim() || "See reference photos";
  const background =
    scene.background?.trim() || inferBackground(productDescription);
  const narrativeRole = scene.narrative_role || "solution";

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

  return `
Create a Pixar/DreamWorks 3D CGI animation frame.

━━━ MANDATORY PIXAR STYLE ━━━
- Quality level: Pixar "Toy Story 4" — NOT photorealistic, NOT dark cinematic
- Subsurface scattering on all surfaces
- Colors: VIBRANT and OVERSATURATED — 40% more vivid than reality
- Lighting: ${mood}
- Smooth 3D surfaces with Pixar-quality textures
- Depth of field bokeh on background elements

━━━ PRODUCT ━━━
Reference photos provided above show the EXACT product.
${analysis}
- IDENTICAL shape, proportions, silhouette, colors, finish
- Product must be 100% recognizable

━━━ FACE OF THE PRODUCT — EYES + MOUTH ━━━
The product has a face with TWO elements ONLY:
1. LARGE expressive Pixar cartoon eyes — highlights, pupils, emotional expression (${scene.emotion || "excited"})
2. A MOUTH — simple curved cartoon mouth showing emotion: ${mouthExpr}
   - Happy/excited: big wide smile showing teeth
   - Determined: confident smirk
   - Surprised: open "O" mouth
   - Dramatic: slightly open mouth mid-speech

The face is placed naturally on the front surface of the product.
Eyes and mouth must look like the product is SPEAKING and ALIVE.
Like Pixar's Cars — eyes on windshield + mouth on bumper.

NO arms. NO hands. NO legs. NO other body parts.
ONLY eyes + mouth on the product surface.

━━━ NO BACKGROUND CHARACTERS ━━━
ONLY the main product character in the scene.
NO other animated objects with eyes or faces in the background.
NO secondary characters. The product is the SOLE character.
Background contains only inanimate objects (furniture, props, decor).

━━━ BACKGROUND ━━━
${background}
- Rich contextual environment — NEVER white or plain
- ${mood}

━━━ SCENE ━━━
${sceneDesc}

━━━ TEMPLATE ━━━
${buildTemplateInstructions(template, sceneDesc, analysis)}

━━━ FORMAT ━━━
Vertical 9:16 portrait — product center stage, ~60% of frame height
`;
}

function buildTemplateInstructions(
  template: string,
  sceneDesc: string,
  productAnalysis: string
): string {
  const raw = template?.toLowerCase().replace(/[\s_]/g, "-") || "produit-vivant";
  const aliases: Record<string, string> = {
    living_product: "produit-vivant",
    influencer: "influenceur",
    before_after: "avant-apres",
    product_demo: "demo-produit",
    absurd_problem: "probleme-absurde",
    testimonial: "temoignages",
  };
  const t = aliases[raw] || raw;

  const instructions: Record<string, string> = {
    "produit-vivant": `
TEMPLATE — LIVING PRODUCT (Pixar Cars style — eyes + mouth only):
- The product IS the sole character — expressive eyes AND a speaking mouth on its surface
- NO arms, NO limbs, NO appendages — original shape 100% preserved
- Mouth visible and expressive — product looks like it is talking
- NO other characters or faced objects in the background
- Product details: ${productAnalysis}`,

    influenceur: `
TEMPLATE — CARTOON INFLUENCER:
- Stylized 3D character with Pixar proportions (big head, expressive eyes)
- Character holds the product prominently — product IDENTICAL to reference
- Direct eye contact with camera, enthusiastic expression
- Lifestyle background matching product use case
- Product details: ${productAnalysis}`,

    "avant-apres": `
TEMPLATE — BEFORE/AFTER:
- Dramatic visual contrast — dark gloomy left vs bright vivid right
- Pixar expressive character showing pain/problem then joy/solution
- Product prominently featured in the AFTER side
- Product IDENTICAL to reference photos
- ${productAnalysis}`,

    "demo-produit": `
TEMPLATE — PRODUCT DEMO:
- Cinematic close-up of the product — every Pixar-stylized detail visible
- Dramatic lighting that makes the product glow and look premium
- Product IDENTICAL to reference, translated into Pixar 3D aesthetic
- Clean dramatic background with light rays or glow effects
- ${productAnalysis}`,

    lifestyle: `
TEMPLATE — LIFESTYLE:
- Pixar character using the product naturally in context
- Warm aspirational environment
- Product IDENTICAL to reference, clearly visible in use
- ${productAnalysis}`,

    "probleme-absurde": `
TEMPLATE — ABSURD PROBLEM:
- Over-the-top exaggerated problem scene, Pixar humor style
- Dramatic expressions, exaggerated body language
- Product appears as the heroic solution — IDENTICAL to reference
- ${productAnalysis}`,

    unboxing: `
TEMPLATE — PREMIUM UNBOXING:
- Dramatic spotlight on product/packaging
- Product IDENTICAL to reference photos — packaging details perfect
- Luxury feel with god rays and sparkle effects
- ${productAnalysis}`,

    temoignages: `
TEMPLATE — TESTIMONIAL:
- Pixar character giving enthusiastic testimonial
- Product IDENTICAL to reference, visible in hands or background
- Warm trustworthy lighting and composition
- ${productAnalysis}`,
  };

  return instructions[t] || instructions["produit-vivant"];
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
