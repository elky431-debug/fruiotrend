import { NextRequest, NextResponse } from "next/server";
import { extractVideoUrl } from "@/lib/klingFal";
import {
  LIPSYNC_QUEUE,
  pollLipsyncResult,
  uploadAudioToFal,
} from "@/lib/lipsyncFal";
import { bufferLooksLikeMp4 } from "@/lib/videoFetch";

export const maxDuration = 120;

async function verifyVideoUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-65535", Accept: "video/*" },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    return bufferLooksLikeMp4(buf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let fallbackVideoUrl = "";

  try {
    const { videoUrl, audioBase64, audioUrl } = await req.json();
    fallbackVideoUrl = videoUrl || "";

    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FAL_API_KEY manquante", videoUrl: fallbackVideoUrl, lipsyncApplied: false },
        { status: 500 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl manquante", lipsyncApplied: false },
        { status: 400 }
      );
    }

    let finalAudioUrl = audioUrl as string | undefined;
    if (audioBase64 && !finalAudioUrl) {
      finalAudioUrl =
        (await uploadAudioToFal(apiKey, audioBase64)) || undefined;
    }

    if (!finalAudioUrl) {
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
        error: "Audio manquant pour lip sync",
      });
    }

    console.log("[LIPSYNC] Lancement LatentSync...");
    console.log("[LIPSYNC] Video:", videoUrl.slice(0, 80));
    console.log("[LIPSYNC] Audio:", finalAudioUrl.slice(0, 80));

    const auth = { Authorization: `Key ${apiKey}` };

    const falRes = await fetch(LIPSYNC_QUEUE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...auth,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        audio_url: finalAudioUrl,
      }),
    });

    const falText = await falRes.text();

    if (!falRes.ok) {
      console.error("[LIPSYNC] Erreur fal:", falText.slice(0, 400));
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
        error: falText.slice(0, 200),
      });
    }

    let falData: Record<string, unknown>;
    try {
      falData = JSON.parse(falText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
      });
    }

    const directUrl = extractVideoUrl(falData);
    if (directUrl && (await verifyVideoUrl(directUrl))) {
      console.log("[LIPSYNC] ✅ Direct:", directUrl.slice(0, 80));
      return NextResponse.json({ videoUrl: directUrl, lipsyncApplied: true });
    }

    const requestId = falData.request_id as string | undefined;
    if (!requestId) {
      console.warn("[LIPSYNC] Pas de request_id");
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
      });
    }

    const syncedUrl = await pollLipsyncResult(requestId, auth);
    if (syncedUrl) {
      for (let v = 0; v < 4; v++) {
        if (await verifyVideoUrl(syncedUrl)) {
          console.log("[LIPSYNC] ✅ Sync:", syncedUrl.slice(0, 80));
          return NextResponse.json({ videoUrl: syncedUrl, lipsyncApplied: true });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      console.warn("[LIPSYNC] URL sync invalide (MP4 incomplet)");
    }

    console.warn("[LIPSYNC] Timeout — vidéo originale");
    return NextResponse.json({
      videoUrl: fallbackVideoUrl,
      lipsyncApplied: false,
    });
  } catch (error) {
    console.error("[LIPSYNC]", error);
    return NextResponse.json({
      videoUrl: fallbackVideoUrl,
      lipsyncApplied: false,
      error: error instanceof Error ? error.message : "Erreur lip sync",
    });
  }
}
