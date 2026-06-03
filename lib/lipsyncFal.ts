import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extractVideoUrl } from "@/lib/klingFal";
import { falMergeAudioVideo } from "@/lib/falFfmpeg";
import { isFfmpegAvailable } from "@/lib/ffmpeg";

const execFileAsync = promisify(execFile);

export const LIPSYNC_MODELS = {
  wav2lip: "fal-ai/wav2lip",
  syncLipsync: "fal-ai/sync-lipsync",
} as const;

export const LIPSYNC_MODEL = LIPSYNC_MODELS.wav2lip;
export const LIPSYNC_QUEUE = `https://queue.fal.run/${LIPSYNC_MODEL}`;

/**
 * Lip sync fal (sync-lipsync en priorité) activé pour tous les types, y
 * compris Pixar/appli/influenceur : c'est le seul moyen que la bouche dise
 * exactement le mot au bon moment. En cas d'échec du modèle, la route retombe
 * automatiquement sur un mux ffmpeg.
 */
export function shouldUseFalLipsync(opts?: {
  productType?: string;
  template?: string;
  skipLipsync?: boolean;
}): boolean {
  if (opts?.skipLipsync) return false;
  return true;
}

async function uploadBase64ToFal(
  apiKey: string,
  base64: string,
  fileName: string,
  contentType: string
): Promise<string | null> {
  const body = JSON.stringify({
    file_name: fileName,
    content_type: contentType,
    data: base64,
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

export async function uploadAudioToFal(
  apiKey: string,
  audioBase64: string
): Promise<string | null> {
  return uploadBase64ToFal(
    apiKey,
    audioBase64,
    `voice-${Date.now()}.mp3`,
    "audio/mpeg"
  );
}

export async function uploadVideoToFal(
  apiKey: string,
  videoBuffer: Buffer
): Promise<string | null> {
  return uploadBase64ToFal(
    apiKey,
    videoBuffer.toString("base64"),
    `lipsync-${Date.now()}.mp4`,
    "video/mp4"
  );
}

/** Mux vidéo + voiceover alignés (piste audio du modèle ignorée) */
export async function muxVideoWithVoiceover(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const { resolveFfmpegPath } = await import("@/lib/ffmpeg");
  const ffmpeg = resolveFfmpegPath();
  const common = [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
  ];

  try {
    await execFileAsync(ffmpeg, [...common, "-c:v", "copy", outputPath]);
  } catch {
    await execFileAsync(ffmpeg, [
      ...common,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      outputPath,
    ]);
  }
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
