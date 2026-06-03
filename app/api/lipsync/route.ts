import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { requireCredits } from "@/lib/apiCredits";
import { extractVideoUrl } from "@/lib/klingFal";
import {
  LIPSYNC_MODELS,
  muxVideoWithVoiceover,
  shouldUseFalLipsync,
  uploadAudioToFal,
  uploadVideoToFal,
} from "@/lib/lipsyncFal";
import { bufferLooksLikeMp4, downloadVideoToFile } from "@/lib/videoFetch";

export const maxDuration = 180;

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

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

async function saveAudioInput(
  tmpDir: string,
  audioBase64?: string,
  audioUrl?: string
): Promise<string | null> {
  const audioPath = path.join(tmpDir, "audio.mp3");
  if (audioBase64) {
    fs.writeFileSync(audioPath, Buffer.from(audioBase64, "base64"));
    return audioPath;
  }
  if (audioUrl) {
    const aRes = await fetch(audioUrl);
    if (!aRes.ok) return null;
    fs.writeFileSync(audioPath, Buffer.from(await aRes.arrayBuffer()));
    return audioPath;
  }
  return null;
}

/** Mux vidéo + voix sans modèle lip sync (recommandé Pixar / appli) */
async function muxOnlyAndUpload(
  apiKey: string,
  videoPath: string,
  audioPath: string,
  tmpDir: string,
  fallbackUrl: string
): Promise<{ videoUrl: string; mode: "mux-only" }> {
  const mixedPath = path.join(tmpDir, "mixed.mp4");
  await muxVideoWithVoiceover(videoPath, audioPath, mixedPath);
  const mixedBuffer = fs.readFileSync(mixedPath);
  const mixedUrl =
    (await uploadVideoToFal(apiKey, mixedBuffer)) || fallbackUrl;
  return { videoUrl: mixedUrl, mode: "mux-only" };
}

async function runFalLipsyncModel(
  apiKey: string,
  model: string,
  uploadedVideoUrl: string,
  uploadedAudioUrl: string,
  auth: Record<string, string>
): Promise<string | null> {
  const queue = `https://queue.fal.run/${model}`;
  const falRes = await fetch(queue, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({
      video_url: uploadedVideoUrl,
      audio_url: uploadedAudioUrl,
    }),
  });

  if (!falRes.ok) {
    console.warn(`[LIPSYNC] ${model} erreur:`, (await falRes.text()).slice(0, 200));
    return null;
  }

  let falData: Record<string, unknown>;
  try {
    falData = JSON.parse(await falRes.text()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const directUrl = extractVideoUrl(falData);
  if (directUrl && (await verifyVideoUrl(directUrl))) {
    return directUrl;
  }

  const requestId = falData.request_id as string | undefined;
  if (!requestId) return null;

  const statusBase = `https://queue.fal.run/${model}`;
  for (let i = 0; i < 24; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`${statusBase}/requests/${requestId}/status`, {
      headers: auth,
    });
    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()) as Record<string, unknown>;
    const st = String(statusData.status || "").toUpperCase();

    if (st === "COMPLETED" || st === "DONE" || st === "SUCCESS") {
      const fromStatus = extractVideoUrl(statusData);
      if (fromStatus && (await verifyVideoUrl(fromStatus))) return fromStatus;

      const resultRes = await fetch(`${statusBase}/requests/${requestId}`, {
        headers: auth,
      });
      if (resultRes.ok) {
        const url = extractVideoUrl(await resultRes.json());
        if (url && (await verifyVideoUrl(url))) return url;
      }
      return null;
    }

    if (st === "FAILED" || st === "ERROR" || st === "CANCELLED") {
      return null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lipsync-"));
  let fallbackVideoUrl = "";

  try {
    const {
      videoUrl,
      audioBase64,
      audioUrl,
      productType,
      template,
      skipLipsync,
      prepaid,
    } = await req.json();

    // Le crédit "lipsync" est déjà débité par /api/video/generate
    // (requireCreditsMulti video+voice+lipsync). On ne le redébite pas quand
    // l'appel fait partie du flux standard (prepaid).
    if (!prepaid) {
      const creditGuard = await requireCredits(req, "lipsync");
      if (creditGuard instanceof NextResponse) return creditGuard;
    }

    fallbackVideoUrl = videoUrl || "";

    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "FAL_API_KEY manquante",
          videoUrl: fallbackVideoUrl,
          lipsyncApplied: false,
        },
        { status: 500 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl manquante", lipsyncApplied: false },
        { status: 400 }
      );
    }

    const videoPath = path.join(tmpDir, "video.mp4");
    await downloadVideoToFile(videoUrl, videoPath, { label: "lipsync-input" });

    const audioPath = await saveAudioInput(tmpDir, audioBase64, audioUrl);
    if (!audioPath) {
      cleanup(tmpDir);
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
        error: "Audio manquant",
      });
    }

    const useFalLipsync = shouldUseFalLipsync({
      productType,
      template,
      skipLipsync,
    });

    if (!useFalLipsync) {
      console.log(
        "[LIPSYNC] Pixar/appli — pas de Wav2Lip/LatentSync, mux ffmpeg uniquement"
      );
      const muxed = await muxOnlyAndUpload(
        apiKey,
        videoPath,
        audioPath,
        tmpDir,
        fallbackVideoUrl
      );
      cleanup(tmpDir);
      return NextResponse.json({
        videoUrl: muxed.videoUrl,
        lipsyncApplied: false,
        mode: muxed.mode,
      });
    }

    const videoBuffer = fs.readFileSync(videoPath);
    const uploadedVideoUrl =
      (await uploadVideoToFal(apiKey, videoBuffer)) || fallbackVideoUrl;

    const audioBuffer = fs.readFileSync(audioPath);
    const uploadedAudioUrl =
      (await uploadAudioToFal(apiKey, audioBuffer.toString("base64"))) ||
      (audioUrl as string | undefined);

    if (!uploadedVideoUrl || !uploadedAudioUrl) {
      cleanup(tmpDir);
      return NextResponse.json({
        videoUrl: fallbackVideoUrl,
        lipsyncApplied: false,
      });
    }

    const auth = { Authorization: `Key ${apiKey}` };

    console.log("[LIPSYNC] Essai sync-lipsync...");
    let syncedUrl = await runFalLipsyncModel(
      apiKey,
      LIPSYNC_MODELS.syncLipsync,
      uploadedVideoUrl,
      uploadedAudioUrl,
      auth
    );

    if (!syncedUrl) {
      console.log("[LIPSYNC] Essai wav2lip...");
      syncedUrl = await runFalLipsyncModel(
        apiKey,
        LIPSYNC_MODELS.wav2lip,
        uploadedVideoUrl,
        uploadedAudioUrl,
        auth
      );
    }

    if (syncedUrl) {
      cleanup(tmpDir);
      console.log("[LIPSYNC] ✅ Lip sync fal:", syncedUrl.slice(0, 80));
      return NextResponse.json({
        videoUrl: syncedUrl,
        lipsyncApplied: true,
        mode: "fal-lipsync",
      });
    }

    console.warn("[LIPSYNC] Modèles fal échoués — fallback mux ffmpeg");
    const muxed = await muxOnlyAndUpload(
      apiKey,
      videoPath,
      audioPath,
      tmpDir,
      uploadedVideoUrl
    );
    cleanup(tmpDir);
    return NextResponse.json({
      videoUrl: muxed.videoUrl,
      lipsyncApplied: false,
      mode: muxed.mode,
    });
  } catch (error) {
    cleanup(tmpDir);
    console.error("[LIPSYNC]", error);
    return NextResponse.json({
      videoUrl: fallbackVideoUrl || null,
      lipsyncApplied: false,
      error: error instanceof Error ? error.message : "Erreur lip sync",
    });
  }
}
