export interface ImageResult {
  mimeType: string;
  data: string;
  url: string;
  provider: string;
}

const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-exp",
];

const IMAGEN_MODELS = [
  "imagen-3.0-generate-002",
  "imagen-3.0-fast-generate-001",
];

function isRetryableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not found") ||
    m.includes("not supported") ||
    m.includes("quota") ||
    m.includes("limit: 0") ||
    m.includes("billing")
  );
}

export async function tryImagenImage(
  apiKey: string,
  prompt: string,
  aspectRatio: "9:16" | "3:4"
): Promise<ImageResult | null> {
  for (const model of IMAGEN_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message =
          (err as { error?: { message?: string } }).error?.message ?? "";
        if (isRetryableError(message)) continue;
        throw new Error(message);
      }

      const data = await response.json();
      const prediction = data.predictions?.[0];
      const base64 =
        prediction?.bytesBase64Encoded ?? prediction?.image?.bytesBase64Encoded;
      const mimeType = prediction?.mimeType ?? "image/png";

      if (!base64) continue;

      return {
        mimeType,
        data: base64,
        url: `data:${mimeType};base64,${base64}`,
        provider: `imagen (${model})`,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function tryGeminiFlashImage(
  apiKey: string,
  prompt: string
): Promise<ImageResult | null> {
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message =
          (err as { error?: { message?: string } }).error?.message ?? "";
        if (isRetryableError(message)) continue;
        throw new Error(message);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
      );

      if (!imagePart?.inlineData) continue;

      const { mimeType, data: base64 } = imagePart.inlineData;
      return {
        mimeType,
        data: base64,
        url: `data:${mimeType};base64,${base64}`,
        provider: `gemini (${model})`,
      };
    } catch {
      continue;
    }
  }
  return null;
}
