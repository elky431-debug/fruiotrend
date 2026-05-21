import type { ImageResult } from "@/lib/gemini";
import { tryGeminiFlashImage, tryImagenImage } from "@/lib/gemini";
import { generateOpenAIImage } from "@/lib/openai-images";

export type ImageType = "character_sheet" | "scene";

export async function generateImage(
  prompt: string,
  type: ImageType = "scene"
): Promise<ImageResult> {
  const aspectRatio = type === "character_sheet" ? "3:4" : "9:16";
  const errors: string[] = [];

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const imagen = await tryImagenImage(geminiKey, prompt, aspectRatio);
    if (imagen) return imagen;
    errors.push("Imagen : quota ou indisponible");

    const gemini = await tryGeminiFlashImage(geminiKey, prompt);
    if (gemini) return gemini;
    errors.push("Gemini Flash : quota free tier épuisé");
  } else {
    errors.push("GEMINI_API_KEY manquante");
  }

  try {
    return await generateOpenAIImage(prompt, type);
  } catch (e) {
    errors.push(
      `OpenAI DALL-E : ${e instanceof Error ? e.message : "erreur"}`
    );
  }

  throw new Error(
    `Impossible de générer l'image. ${errors.join(" · ")}. ` +
      `Active la facturation sur Google AI Studio pour Gemini, ou vérifie ta clé OpenAI.`
  );
}
