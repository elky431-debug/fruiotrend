import { extractVideoUrl } from "@/lib/klingFal";

export const LIPSYNC_MODEL = "fal-ai/latentsync";
export const LIPSYNC_QUEUE = `https://queue.fal.run/${LIPSYNC_MODEL}`;

export async function uploadAudioToFal(
  apiKey: string,
  audioBase64: string
): Promise<string | null> {
  const body = JSON.stringify({
    file_name: `voice-${Date.now()}.mp3`,
    content_type: "audio/mpeg",
    data: audioBase64,
  });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Key ${apiKey}`,
  };

  const endpoints = [
    "https://fal.run/fal-ai/storage/upload/base64",
    "https://rest.alpha.fal.ai/storage/upload/base64",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (!res.ok) continue;
      const json = (await res.json()) as { url?: string; file_url?: string };
      return json.url || json.file_url || null;
    } catch {
      /* next */
    }
  }
  return null;
}

export async function pollLipsyncResult(
  requestId: string,
  auth: Record<string, string>,
  maxAttempts = 24,
  intervalMs = 5000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    const statusRes = await fetch(
      `${LIPSYNC_QUEUE}/requests/${requestId}/status`,
      { headers: auth }
    );
    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()) as Record<string, unknown>;
    const st = String(statusData.status || "").toUpperCase();

    if (st === "COMPLETED" || st === "DONE" || st === "SUCCESS") {
      const fromStatus = extractVideoUrl(statusData);
      if (fromStatus) return fromStatus;

      const resultRes = await fetch(
        `${LIPSYNC_QUEUE}/requests/${requestId}`,
        { headers: auth }
      );
      if (resultRes.ok) {
        const resultJson = await resultRes.json();
        return extractVideoUrl(resultJson);
      }
    }

    if (st === "FAILED" || st === "ERROR" || st === "CANCELLED") {
      return null;
    }
  }
  return null;
}
