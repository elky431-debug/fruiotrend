import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import { requireApiUser } from "@/lib/auth-api";
import { checkAndDeduct, getCredits } from "@/lib/credits";
import { insufficientCreditsResponse } from "@/lib/apiCredits";
import { analyzeProductImages } from "@/lib/productAnalysis";
import { addTextOverlay } from "@/lib/creatives-text";

export const maxDuration = 300;
export const runtime = "nodejs";

const PRIMARY_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const FALLBACK_IMAGE_MODELS = ["gemini-2.5-flash-image"];

const OUTPUT_SIZE = 1080;

type TextOverlayConfig = {
  position: "top" | "left";
} | null;

type CreativeTemplate = {
  id: string;
  name: string;
  description: string;
  textOverlay: TextOverlayConfig;
  prompt: (productDesc: string, benefit?: string) => string;
};

const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  {
    id: "packshot",
    name: "Packshot Principal",
    description: "Fond blanc studio, produit centré — image principale e-commerce",
    textOverlay: null,
    prompt: (desc) => `
Professional product packshot photography. Product: ${desc}

- Product alone, perfectly centered, facing camera directly
- Pure white or very light grey background (#f9f9f9)
- Soft studio lighting, one clean drop shadow beneath
- Sharp crisp edges, no props, no distractions
- Product fills 65% of frame
- Style: Amazon main image, Apple product page
- Square 1:1 composition, product perfectly centered
- NO text, NO logo, NO watermark in image`,
  },
  {
    id: "situation",
    name: "Produit en Situation",
    description: "Le produit utilisé dans son contexte réel",
    textOverlay: null,
    prompt: (desc) => `
Professional lifestyle product photography showing the product being USED. Product: ${desc}

- Show the product actively being used by a person in its natural context
- Person visible but product is the clear hero
- Warm natural lighting, real environment (home, outdoors, office — relevant to product)
- Candid, authentic feel — not posed
- Soft bokeh background keeps focus on product
- Square 1:1 composition
- NO text in image`,
  },
  {
    id: "detail",
    name: "Gros Plan Détail",
    description: "Macro sur matière, finition ou mécanisme clé",
    textOverlay: null,
    prompt: (desc) => `
Professional macro/detail product photography. Product: ${desc}

- Extreme close-up highlighting the key material, texture, or mechanism of the product
- Show what makes the product premium: fabric quality, finish, connector, button, joint
- Clean neutral background, razor-sharp focus on detail
- Professional macro lighting that reveals texture and quality
- Square 1:1 tight crop
- NO text in image`,
  },
  {
    id: "lifestyle",
    name: "Lifestyle Ambiance",
    description: "Mise en scène aspirante, ambiance premium",
    textOverlay: null,
    prompt: (desc) => `
Professional aspirational lifestyle product photography. Product: ${desc}

- Product placed in a beautiful, aspirational lifestyle setting
- Sell the FEELING, not just the product: comfort, wellness, style, adventure (match product category)
- Warm tones, golden light, carefully chosen props that complement without cluttering
- Person or product harmoniously integrated in scene
- Pinterest/Instagram premium quality
- Square 1:1 composition
- NO text in image`,
  },
  {
    id: "benefit",
    name: "Bénéfice Visuel",
    description: "Le bénéfice clé mis en avant visuellement",
    textOverlay: null,
    prompt: (desc) => `
Professional product benefit visualization. Product: ${desc}

- Split or annotated image showing the KEY BENEFIT of the product visually
- If heating product: show heat/warmth effect (infrared glow, comfort)
- If waterproof: show water interaction
- If 2-in-1: show both functions side by side
- Before/after comparison OR feature highlight with clean annotation lines
- Clean background, product prominent
- Make the benefit IMMEDIATELY obvious at a glance
- Square 1:1 composition
- Leave clean space on the LEFT third for text overlay (solid or gradient area)
- NO text generated in image — text will be added separately`,
  },
  {
    id: "scale",
    name: "Échelle & Taille",
    description: "Produit en main pour montrer la taille réelle",
    textOverlay: null,
    prompt: (desc) => `
Professional product scale photography. Product: ${desc}

- Product held in a human hand to show real-world size
- Hand is clean, well-groomed, neutral skin tone
- White or very light background
- Product clearly the focus, hand provides scale reference only
- Sharp focus on product, slightly softer on hand
- Shows the product's real dimensions intuitively
- Square 1:1 composition
- NO text in image`,
  },
  {
    id: "flatlay",
    name: "Flat Lay Contenu Colis",
    description: "Vue du dessus avec tout le contenu du colis",
    textOverlay: null,
    prompt: (desc) => `
Professional overhead flat lay showing complete package contents. Product: ${desc}

- Perfect 90-degree top-down shot
- All items included in the package arranged symmetrically around the main product
- Clean white background, even lighting, no shadows
- Geometric/symmetrical layout, everything perfectly aligned
- Main product centered and largest, accessories arranged around it
- Style: unboxing reveal, package contents overview
- Square 1:1 composition
- NO text in image`,
  },
  {
    id: "story",
    name: "Story / Reel Cover",
    description: "Couverture story avec headline — prêt pour Reels et TikTok",
    textOverlay: { position: "top" },
    prompt: (desc) => `
Professional social media product creative. Product: ${desc}

- Square 1:1 composition with safe zone at top
- Product large and prominent, lower two-thirds of frame
- Upper third: leave CLEAN SPACE (solid color or very subtle gradient) for text overlay
- Background color should complement the product's color palette
- Bold, eye-catching composition that stops the scroll
- Style: TikTok Shop ad, Instagram Story sponsored post
- The image must work with white bold text overlaid on the top area
- NO text generated in image — text will be added separately`,
  },
];

const REALISM_RULE = `
HUMAN REALISM RULE (applies to ALL scenes with people):
- Any person in the image must look 100% PHOTORÉALISTIC
- Real skin texture, real hair, real clothing fabric, real lighting on skin
- NOT illustrated, NOT cartoon, NOT Pixar, NOT 3D rendered, NOT anime
- Photography quality: skin pores visible, natural imperfections, subsurface scattering on skin
- Style reference: professional commercial photography shot on Sony A7R or Canon R5
- The person should look like a real human being photographed in a studio or real location
- Natural diverse appearance — avoid generic stock photo look
- Authentic expressions and body language`;

const QUALITY_RULE = `
OVERALL IMAGE QUALITY:
- Commercial photography quality throughout
- Sharp focus on product, natural depth of field
- Professional color grading — warm and inviting or clean and technical (match product)
- No AI artifacts, no distorted hands, no blurry product edges
- Ready to publish on Etsy, Amazon, or Instagram without any editing`;

const PRODUCT_FIDELITY_RULE = `
PRODUCT FIDELITY:
- The product in your image must be IDENTICAL to the reference photos provided
- Same exact shape, color, size, details, finish
- Do not invent features or change the product's appearance
- Square 1:1 framing — center the product, balanced composition
- NO watermarks, NO copyright symbols, NO logos that are not on the original product`;

function buildFullPrompt(
  template: CreativeTemplate,
  productDesc: string,
  benefit: string,
  customRequest: string
): string {
  const templatePrompt = template.prompt(productDesc, benefit).trim();

  const customBlock = customRequest.trim()
    ? `
USER SPECIFIC REQUEST — PRIORITY INSTRUCTION:
The user has added this specific request for ALL creatives:
"${customRequest.trim()}"
Apply this instruction while respecting all other rules above.`
    : "";

  return `REFERENCE IMAGES ABOVE: these show the exact product to feature.
Study the product's shape, color, material, and details carefully.
The product in your output MUST be visually identical to these reference images.

${templatePrompt}

${REALISM_RULE}

${QUALITY_RULE}
${customBlock}

${PRODUCT_FIDELITY_RULE}`;
}

type GeneratedCreative = {
  id: string;
  name: string;
  description: string;
  aspectRatio: "1:1";
  imageBase64: string;
  mimeType: string;
};

async function finalizeCreativeImage(
  rawBase64: string,
  template: CreativeTemplate,
  benefit: string
): Promise<Buffer> {
  let imageBuffer: Buffer = Buffer.from(rawBase64, "base64");

  imageBuffer = Buffer.from(
    await sharp(imageBuffer)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 95 })
      .toBuffer()
  );

  if (template.id === "benefit" || template.id === "story") {
    imageBuffer = Buffer.from(
      await addTextOverlay({
        imageBuffer,
        headline: benefit || "Qualite Premium",
        subtext: "Decouvrir maintenant",
        position: template.id === "story" ? "top" : "left",
        theme: "dark",
      })
    );
  }

  return imageBuffer;
}

async function generateCreative(
  genAI: GoogleGenerativeAI,
  template: CreativeTemplate,
  productDesc: string,
  benefit: string,
  customRequest: string,
  productImages: { mimeType: string; data: string }[]
): Promise<GeneratedCreative> {
  const prompt = buildFullPrompt(template, productDesc, benefit, customRequest);

  const parts = [
    ...productImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    { text: prompt },
  ];

  const models = [PRIMARY_IMAGE_MODEL, ...FALLBACK_IMAGE_MODELS];
  let lastError = "";

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.7,
          imageConfig: { aspectRatio: "1:1" },
        } as never,
      });

      const responseParts =
        result.response.candidates?.[0]?.content?.parts || [];
      const inline = responseParts.find((p) => p.inlineData?.data)?.inlineData;
      if (inline?.data) {
        const finalBuffer = await finalizeCreativeImage(
          inline.data,
          template,
          benefit
        );
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          aspectRatio: "1:1",
          imageBase64: finalBuffer.toString("base64"),
          mimeType: "image/jpeg",
        };
      }
      lastError = `${modelName}: pas d'image`;
    } catch (err) {
      lastError = `${modelName}: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  throw new Error(lastError || `Échec génération ${template.id}`);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser(req);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Service visuels PubMoi indisponible. Réessaie plus tard." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("images").filter(
      (f): f is File => f instanceof File
    );
    const description =
      (formData.get("description") as string | null)?.trim() || "";
    const benefit =
      (formData.get("benefit") as string | null)?.trim() || "Qualité Premium";
    const customRequest =
      (formData.get("customRequest") as string | null)?.trim() || "";

    if (!files.length) {
      return NextResponse.json(
        { error: "Aucune image fournie" },
        { status: 400 }
      );
    }

    const balance = await getCredits(userId);
    if (balance < 1) {
      return insufficientCreditsResponse({
        success: false,
        remaining: balance,
        cost: 1,
      });
    }

    const plannedTemplates = CREATIVE_TEMPLATES.slice(
      0,
      Math.max(1, Math.min(CREATIVE_TEMPLATES.length, balance))
    );

    const productImages = await Promise.all(
      files.slice(0, 3).map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return {
          mimeType: file.type || "image/jpeg",
          data: buffer.toString("base64"),
        };
      })
    );

    const finalDescription =
      description ||
      (await analyzeProductImages(
        productImages.map((img) => ({
          base64: img.data,
          mimeType: img.mimeType,
        })),
        ""
      ));

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const results = await Promise.allSettled(
      plannedTemplates.map((template) =>
        generateCreative(
          genAI,
          template,
          finalDescription,
          benefit,
          customRequest,
          productImages
        )
      )
    );

    const creatives = results
      .filter(
        (r): r is PromiseFulfilledResult<GeneratedCreative> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    const failed = results.length - creatives.length;

    let charged = 0;
    for (let i = 0; i < creatives.length; i++) {
      const deduction = await checkAndDeduct(userId, "creative");
      if (!deduction.success) break;
      charged += 1;
    }

    if (creatives.length === 0) {
      return NextResponse.json(
        {
          error:
            "Génération des créatives indisponible pour le moment. Réessaie.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      creatives,
      total: creatives.length,
      failed,
      charged,
      productDescription: finalDescription,
    });
  } catch (error) {
    console.error("[CREATIVES] Erreur:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la génération des créatives",
      },
      { status: 500 }
    );
  }
}
