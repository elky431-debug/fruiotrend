import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

type ProductImageInput =
  | string
  | {
      base64?: string;
      mimeType?: string;
      url?: string;
    };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scene, productDescription, productImages, template, sceneIndex } =
      body as {
        scene?: {
          visual_description?: string;
          description?: string;
          subtitle?: string;
          emotion?: string;
        };
        productDescription?: string;
        productImages?: ProductImageInput[];
        template?: string;
        sceneIndex?: number;
      };

    console.log(
      "[IMAGES] Génération scène",
      sceneIndex,
      "— template:",
      template
    );

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY manquante" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const imagePrompt = buildImagePrompt(
      scene,
      productDescription || "",
      template || ""
    );
    console.log("[IMAGES] Prompt:", imagePrompt.substring(0, 100));

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (productImages && productImages.length > 0) {
      for (const img of productImages.slice(0, 3)) {
        if (typeof img === "string") {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: img,
            },
          });
          continue;
        }

        if (img.base64) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || "image/jpeg",
              data: img.base64,
            },
          });
        }
      }
    }

    parts.push({ text: imagePrompt });

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: 0.8,
      } as never,
    });

    const response = result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      console.error("[IMAGES] Pas de candidats dans la réponse");
      return NextResponse.json(
        { error: "Gemini n'a retourné aucun résultat" },
        { status: 500 }
      );
    }

    const parts2 = candidates[0].content?.parts || [];
    let imageBase64 = "";
    let mimeType = "image/jpeg";

    for (const part of parts2) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/jpeg";
        break;
      }
    }

    if (!imageBase64) {
      console.log("[IMAGES] Retry avec modèle preview...");
      return await generateWithPreviewModel(parts, sceneIndex);
    }

    console.log("[IMAGES] ✅ Image générée pour scène", sceneIndex);
    return NextResponse.json({
      imageBase64,
      mimeType,
      imageUrl: `data:${mimeType};base64,${imageBase64}`,
    });
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

async function generateWithPreviewModel(
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >,
  sceneIndex: number | undefined
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-preview-image-generation",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    } as never,
  });

  const parts2 = result.response.candidates?.[0]?.content?.parts || [];

  for (const part of parts2) {
    if (part.inlineData?.data) {
      const imageBase64 = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || "image/jpeg";
      console.log("[IMAGES] ✅ Image générée (preview) pour scène", sceneIndex);
      return NextResponse.json({
        imageBase64,
        mimeType,
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
      });
    }
  }

  return NextResponse.json(
    { error: "Impossible de générer l'image" },
    { status: 500 }
  );
}

function buildImagePrompt(
  scene: {
    visual_description?: string;
    description?: string;
    subtitle?: string;
    emotion?: string;
  } = {},
  productDescription: string,
  template: string
): string {
  const sceneDesc =
    scene.visual_description || scene.description || scene.subtitle || "";
  const baseStyle = `Pixar/DreamWorks quality 3D CGI animation style, vibrant saturated colors,
cinematic lighting, vertical 9:16 portrait format, professional product advertisement`;

  const templateInstructions: Record<string, string> = {
    "produit-vivant": `The product comes alive with expressive cartoon eyes on its surface and small arms emerging from the sides.
The product packaging must be IDENTICAL to the reference photos — same colors, same logo, same shape.
NOT a mascot inspired by the product — the EXACT product animated. ${sceneDesc}`,
    living_product: `The product comes alive with expressive cartoon eyes on its surface and small arms emerging from the sides.
The product packaging must be IDENTICAL to the reference photos — same colors, same logo, same shape.
NOT a mascot inspired by the product — the EXACT product animated. ${sceneDesc}`,
    influenceur: `Animated cartoon character holding the product and speaking directly to camera, UGC style.
The product in their hands must match EXACTLY the reference photos. ${sceneDesc}`,
    influencer: `Animated cartoon character holding the product and speaking directly to camera, UGC style.
The product in their hands must match EXACTLY the reference photos. ${sceneDesc}`,
    "avant-apres": `Split scene or dramatic transformation. ${sceneDesc}.
Show the product prominently with packaging identical to reference photos.`,
    before_after: `Split scene or dramatic transformation. ${sceneDesc}.
Show the product prominently with packaging identical to reference photos.`,
    "demo-produit": `Cinematic close-up product demonstration, Apple-style keynote aesthetic.
Deep focus on product details. Packaging identical to reference photos. ${sceneDesc}`,
    product_demo: `Cinematic close-up product demonstration, Apple-style keynote aesthetic.
Deep focus on product details. Packaging identical to reference photos. ${sceneDesc}`,
    lifestyle: `Animated character using the product naturally in daily life.
Warm lifestyle setting. Product visible with packaging matching reference photos. ${sceneDesc}`,
    "probleme-absurde": `Exaggerated absurd problem scene, humor and drama.
The product appears as the hero solution. ${sceneDesc}`,
    absurd_problem: `Exaggerated absurd problem scene, humor and drama.
The product appears as the hero solution. ${sceneDesc}`,
    unboxing: `Premium unboxing scene, dramatic lighting on the package.
Product packaging IDENTICAL to reference photos — same colors, logo, shape. ${sceneDesc}`,
    temoignages: `Animated character giving a testimonial, warm and authentic expression.
Product visible in background or hands. ${sceneDesc}`,
    testimonial: `Animated character giving a testimonial, warm and authentic expression.
Product visible in background or hands. ${sceneDesc}`,
  };

  const templateKey = template?.toLowerCase().replace(/\s+/g, "-") || "produit-vivant";
  const templateInstr =
    templateInstructions[templateKey] || templateInstructions["produit-vivant"];

  return `${baseStyle}.

PRODUCT: ${productDescription}

SCENE: ${templateInstr}

CRITICAL RULES:
- The product packaging must be 100% identical to the reference photos provided above
- Same colors, same logo text, same shape, same finish — DO NOT simplify or reinterpret
- VERTICAL 9:16 portrait format ONLY
- NO white background — use a rich contextual environment related to the product
- Pixar 3D CGI style — NOT photorealistic, NOT flat illustration
- High quality render with depth of field and cinematic lighting`;
}
