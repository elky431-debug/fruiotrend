export interface GrokAnimationResult {
  videoUrl: string | null;
  text: string;
  prompt_to_copy: string;
}

export async function generateGrokAnimation(params: {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<GrokAnimationResult> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not configured");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  if (params.imageBase64) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${params.imageMimeType ?? "image/jpeg"};base64,${params.imageBase64}`,
      },
    });
  }

  content.push({ type: "text", text: params.prompt });

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-vision-1212",
      messages: [{ role: "user", content }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `Grok API error ${response.status}`
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  const isVideoUrl =
    text.trim().startsWith("http") &&
    (text.includes(".mp4") || text.includes("video"));

  return {
    videoUrl: isVideoUrl ? text.trim() : null,
    text,
    prompt_to_copy: params.prompt,
  };
}
