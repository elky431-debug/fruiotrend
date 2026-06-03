import { extractVideoUrl } from "@/lib/klingFal";

const MERGE_AUDIO_VIDEO =
  "https://fal.run/fal-ai/ffmpeg-api/merge-audio-video";
const MERGE_VIDEOS = "https://fal.run/fal-ai/ffmpeg-api/merge-videos";

function requireFalKey(): string {
  const key = process.env.FAL_API_KEY;
  if (!key) {
    throw new Error("Service vidéo PubMoi temporairement indisponible.");
  }
  return key;
}

async function falRun(modelUrl: string, body: Record<string, unknown>): Promise<string> {
  const apiKey = requireFalKey();
  const res = await fetch(modelUrl, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[FAL-FFMPEG] Erreur:", text.slice(0, 300));
    throw new Error("Assemblage vidéo PubMoi indisponible. Réessaie.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Assemblage vidéo PubMoi : réponse invalide.");
  }

  const videoUrl = extractVideoUrl(data);
  if (!videoUrl) {
    console.error("[FAL-FFMPEG] Pas d'URL:", text.slice(0, 300));
    throw new Error("Assemblage vidéo PubMoi : URL manquante.");
  }

  return videoUrl;
}

/** Mixe une vidéo muette + une piste audio (cloud, sans ffmpeg local). */
export async function falMergeAudioVideo(
  videoUrl: string,
  audioUrl: string
): Promise<string> {
  console.log("[FAL-FFMPEG] merge-audio-video");
  return falRun(MERGE_AUDIO_VIDEO, { video_url: videoUrl, audio_url: audioUrl });
}

/** Concatène plusieurs clips vidéo (cloud). */
export async function falMergeVideos(videoUrls: string[]): Promise<string> {
  if (videoUrls.length === 0) {
    throw new Error("Aucun clip à assembler");
  }
  if (videoUrls.length === 1) return videoUrls[0];

  console.log("[FAL-FFMPEG] merge-videos ×", videoUrls.length);
  return falRun(MERGE_VIDEOS, {
    video_urls: videoUrls,
    target_fps: 24,
    resolution: { width: 720, height: 1280 },
  });
}

/** Télécharge une URL vidéo et renvoie le buffer MP4. */
export async function fetchVideoBuffer(videoUrl: string): Promise<Buffer> {
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error("Téléchargement de la vidéo finale échoué.");
  }
  return Buffer.from(await res.arrayBuffer());
}
