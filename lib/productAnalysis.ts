import OpenAI from "openai";

export type ProductImageRef = {
  base64: string;
  mimeType?: string;
};

const VISION_PROMPT = `Describe this product with extreme visual precision for an AI image generator.
Include:
1. Exact shape and silhouette
2. ALL colors with their exact location (main color, accent colors, any rings/stripes/indicators)
3. Surface finish (matte/glossy/textured)
4. ALL distinctive visual details (logos, buttons, LEDs, rings, labels, patterns)
5. Overall dimensions feel (compact/large/slim/bulky)

Be extremely specific. Example: "Black handheld massager gun, T-shaped, matte black finish,
bright green LED ring at the base of the handle, round massage head on left side,
grip texture on handle, small power button on front panel"

Respond in English, max 100 words.`;

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
    console.warn("[PRODUCT] OPENAI_API_KEY manquante — description texte utilisée");
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
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [...imageContents, { type: "text", text: VISION_PROMPT }],
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content?.trim();
    if (analysis) {
      console.log("[PRODUCT] Analyse GPT-4o:", analysis.substring(0, 120));
      return analysis;
    }
  } catch (err) {
    console.error(
      "[PRODUCT] Erreur analyse:",
      err instanceof Error ? err.message : err
    );
  }

  return fallback;
}
