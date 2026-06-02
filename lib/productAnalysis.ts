import OpenAI from "openai";

export type ProductImageRef = {
  base64: string;
  mimeType?: string;
};

const VISION_PROMPT = `You are analyzing a product image to create an exact visual description for an AI image generator.

Describe this product with EXTREME precision. Focus on:

1. SHAPE: What is the exact geometric shape? (T-shape, cylinder, rectangle, gun-shape, bottle, etc.)
   - Describe every part: handle, head, body, attachments
   - Proportions: which part is longest/widest

2. COLORS: List every color and exactly where it appears
   - Main body color
   - Accent colors (rings, buttons, logos, labels)
   - Any gradients or finishes (matte, glossy, metallic)

3. DISTINCTIVE FEATURES: What makes this product unique visually?
   - Specific markings, logos, LEDs, rings
   - Texture patterns
   - Attachments or accessories visible

4. SIZE FEEL: Does it feel compact/large/slim/bulky?

Format your response as a single paragraph starting with the shape, then colors, then distinctive features.
Example: "T-shaped massage gun with a perpendicular head on a cylindrical handle, matte black finish, bright green LED ring at the base of the handle, round massage head on the left side..."

Be extremely specific. Max 150 words. English only.`;

const INFLUENCER_VISION_PROMPT = `You are describing a person in a photo so an AI image generator can create an ORIGINAL stylized 3D Pixar cartoon character that resembles them. Do NOT identify or name the person.

Describe ONLY these visual traits, in English, in a single short paragraph (max 90 words):
- Apparent gender presentation and approximate age range (e.g. "young woman, early 20s")
- Hair: color, length, style/texture
- Skin tone
- Facial hair if any
- Eye color if clearly visible
- Glasses or notable accessories
- Overall vibe/energy (e.g. friendly, sporty, elegant)
- Outfit style if visible

Keep it factual and concise. Output the paragraph only, no preamble.`;

export async function describeInfluencerPhoto(
  image: { base64?: string; mimeType?: string } | null | undefined
): Promise<string> {
  if (!image?.base64) return "";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[INFLUENCER] OPENAI_API_KEY manquante — photo non décrite"
    );
    return "";
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 250,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${image.mimeType || "image/jpeg"};base64,${image.base64}`,
                detail: "high" as const,
              },
            },
            { type: "text", text: INFLUENCER_VISION_PROMPT },
          ],
        },
      ],
    });

    const desc = response.choices[0]?.message?.content?.trim();
    if (desc) {
      console.log("[INFLUENCER] Description photo:", desc);
      return desc;
    }
  } catch (err) {
    console.error(
      "[INFLUENCER] Erreur description photo:",
      err instanceof Error ? err.message : err
    );
  }

  return "";
}

export async function analyzeProductImages(
  productImages: ProductImageRef[] | undefined,
  productDescription: string
): Promise<string> {
  const fallback =
    productDescription?.trim() || "Product as shown in reference photos";

  if (!productImages?.length) {
    return fallback;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[ANALYZE] OPENAI_API_KEY manquante — description texte utilisée");
    return fallback;
  }

  try {
    const imageContents = productImages.slice(0, 3).map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}`,
        detail: "high" as const,
      },
    }));

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [...imageContents, { type: "text", text: VISION_PROMPT }],
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content?.trim();
    if (analysis) {
      console.log("[ANALYZE] Analyse produit:", analysis);
      return analysis;
    }
  } catch (err) {
    console.error(
      "[ANALYZE] Erreur:",
      err instanceof Error ? err.message : err
    );
  }

  return fallback;
}
