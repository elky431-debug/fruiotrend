import type { VideoModel } from "@/types/drama";

const BASE_URL = "https://nanobananavideo.com/api/v1";

export interface TextToVideoParams {
  prompt: string;
  resolution?: "720p" | "1080p";
  duration?: number;
  aspect_ratio?: "9:16" | "16:9";
  model?: VideoModel;
}

export interface TextToVideoResponse {
  video_id: string;
  status: string;
  video_url?: string;
}

export interface VideoStatusResponse {
  video_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  url?: string;
  video_url?: string;
  error?: string;
}

function getApiKey(): string {
  const key = process.env.NANO_BANANA_API_KEY;
  if (!key) throw new Error("NANO_BANANA_API_KEY is not configured");
  return key;
}

export function resolutionForModel(model: VideoModel): "720p" | "1080p" {
  return model === "nano-banana-pro" ? "1080p" : model === "nano-banana-2" ? "1080p" : "720p";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nano Banana API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function createTextToVideo(
  params: TextToVideoParams
): Promise<TextToVideoResponse> {
  const resolution = params.resolution ?? resolutionForModel(params.model ?? "nano-banana");

  return apiFetch<TextToVideoResponse>("/text-to-video.php", {
    method: "POST",
    body: JSON.stringify({
      prompt: params.prompt,
      resolution,
      duration: Math.min(8, Math.max(4, params.duration ?? 5)),
      aspect_ratio: params.aspect_ratio ?? "9:16",
      model: params.model,
    }),
  });
}

export async function getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  const data = await apiFetch<VideoStatusResponse>(
    `/video-status.php?video_id=${encodeURIComponent(videoId)}`
  );
  return {
    ...data,
    url: data.url ?? data.video_url,
  };
}

export function estimateCredits(
  resolution: "720p" | "1080p" = "720p",
  duration = 5
): number {
  let credits = 5;
  if (resolution === "1080p") credits += 2;
  if (duration > 5) credits += duration - 5;
  return credits;
}
