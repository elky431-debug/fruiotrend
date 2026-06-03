import {
  falMergeAudioVideo,
  falMergeVideos,
  fetchVideoBuffer,
} from "@/lib/falFfmpeg";
import { uploadAudioToFal } from "@/lib/lipsyncFal";

export type CloudSceneInput = {
  videoUrl?: string | null;
  audioBase64?: string | null;
  embeddedAudio?: boolean;
  fallbackVideoUrl?: string | null;
};

/**
 * Assemblage vidéo via fal (merge-audio-video + merge-videos) — sans ffmpeg
 * local. Utilisé sur Netlify/serverless où le binaire ffmpeg n'est pas dispo.
 */
export async function assembleScenesCloud(
  scenes: CloudSceneInput[]
): Promise<Buffer> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error("Service vidéo PubMoi temporairement indisponible.");
  }

  const clipUrls: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let videoUrl = scene.videoUrl?.trim() || null;

    if (!videoUrl && scene.fallbackVideoUrl) {
      videoUrl = scene.fallbackVideoUrl.trim();
    }
    if (!videoUrl) {
      console.warn(`[ASSEMBLE/CLOUD] Scène ${i + 1} sans vidéo, skip`);
      continue;
    }

    if (scene.embeddedAudio || !scene.audioBase64) {
      clipUrls.push(videoUrl);
      continue;
    }

    const audioUrl = await uploadAudioToFal(apiKey, scene.audioBase64);
    if (!audioUrl) {
      throw new Error(`Impossible d'héberger la voix (scène ${i + 1}).`);
    }

    const merged = await falMergeAudioVideo(videoUrl, audioUrl);
    clipUrls.push(merged);
    console.log(`[ASSEMBLE/CLOUD] Scène ${i + 1} muxée`);
  }

  if (clipUrls.length === 0) {
    throw new Error("Aucun clip valide généré");
  }

  const finalUrl =
    clipUrls.length === 1 ? clipUrls[0] : await falMergeVideos(clipUrls);

  console.log("[ASSEMBLE/CLOUD] ✅", finalUrl.slice(0, 70));
  return fetchVideoBuffer(finalUrl);
}
