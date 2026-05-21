import OpenAI from "openai";
import type { ImageResult } from "@/lib/gemini";

export async function generateOpenAIImage(
  prompt: string,
  type: "character_sheet" | "scene"
): Promise<ImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const client = new OpenAI({ apiKey });

  const size = type === "scene" ? "1024x1792" : "1024x1792";

  const dallePrompt =
    type === "scene"
      ? `${prompt.slice(0, 3800)} Vertical composition, portrait orientation 9:16.`
      : prompt.slice(0, 4000);

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: dallePrompt,
    n: 1,
    size,
    quality: "hd",
    style: "natural",
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI n'a pas retourné d'image");

  return {
    mimeType: "image/png",
    data: b64,
    url: `data:image/png;base64,${b64}`,
    provider: "dall-e-3 (OpenAI)",
  };
}
