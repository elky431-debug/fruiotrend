import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ensureWavBuffer } from "@/lib/audio";
import { resolveFfmpegPath } from "@/lib/ffmpeg";
import { downloadVideoToFile } from "@/lib/videoFetch";

const execFileAsync = promisify(execFile);
export const maxDuration = 300;
export const runtime = "nodejs";

type SceneInput = {
  videoUrl?: string | null;
  videoBase64?: string | null;
  audioBase64?: string | null;
  audioMimeType?: string | null;
  /** Vidéo déjà muxée avec la voix (LatentSync) */
  embeddedAudio?: boolean;
  /** URL LTX d’origine si le lip sync renvoie un fichier corrompu */
  fallbackVideoUrl?: string | null;
};

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

async function assembleClipUrlsOnly(clipUrls: string[]) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pubmoi-clips-"));
  const ffmpeg = resolveFfmpegPath();

  try {
    const normalizedPaths: string[] = [];
    const vf =
      "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280";

    for (let i = 0; i < clipUrls.length; i++) {
      const clipPath = path.join(tmpDir, `clip_${i}.mp4`);
      await downloadVideoToFile(clipUrls[i], clipPath, {
        label: `clip-${i}`,
      });

      const normalizedPath = path.join(tmpDir, `norm_${i}.mp4`);
      await execFileAsync(ffmpeg, [
        "-y",
        "-i",
        clipPath,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-r",
        "30",
        "-an",
        normalizedPath,
      ]);
      normalizedPaths.push(normalizedPath);
    }

    if (normalizedPaths.length === 1) {
      const finalBuffer = fs.readFileSync(normalizedPaths[0]);
      cleanup(tmpDir);
      return new NextResponse(finalBuffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="pub.mp4"',
        },
      });
    }

    const listPath = path.join(tmpDir, "list.txt");
    const listContent = normalizedPaths
      .map((p) => `file '${p.replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(listPath, listContent);

    const finalPath = path.join(tmpDir, "final.mp4");
    await execFileAsync(ffmpeg, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      finalPath,
    ]);

    const finalBuffer = fs.readFileSync(finalPath);
    cleanup(tmpDir);
    return new NextResponse(finalBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="pub.mp4"',
      },
    });
  } catch (err) {
    cleanup(tmpDir);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    scenes?: SceneInput[];
    clipUrls?: string[];
    singleImageMode?: boolean;
  };

  const { scenes, clipUrls, singleImageMode } = body;

  if (singleImageMode && clipUrls && clipUrls.length > 0) {
    try {
      return await assembleClipUrlsOnly(clipUrls);
    } catch (error) {
      console.error("[ASSEMBLE] singleImageMode:", error);
      const raw =
        error instanceof Error ? error.message : "Erreur assemblage clips";
      const message =
        raw.includes("ENOENT") && raw.includes("ffmpeg")
          ? "FFmpeg introuvable sur le serveur. Redémarre « npm run dev » après « npm install », ou définis FFMPEG_PATH dans .env.local"
          : raw;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pubmoi-"));

  try {
    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: "Aucune scène fournie" },
        { status: 400 }
      );
    }

    const ffmpeg = resolveFfmpegPath();
    console.log("[ASSEMBLE] ffmpeg:", ffmpeg);
    const clipPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const videoPath = path.join(tmpDir, `video_${i}.mp4`);
      let audioPath = path.join(tmpDir, `audio_${i}.wav`);
      const clipPath = path.join(tmpDir, `clip_${i}.mp4`);

      if (scene.videoBase64) {
        fs.writeFileSync(videoPath, Buffer.from(scene.videoBase64, "base64"));
      } else if (scene.videoUrl) {
        try {
          await downloadVideoToFile(scene.videoUrl, videoPath, {
            label: `scène-${i + 1}`,
          });
        } catch (dlErr) {
          if (scene.fallbackVideoUrl) {
            console.warn(
              `[ASSEMBLE] Scène ${i + 1}: URL lip sync invalide, fallback LTX`
            );
            await downloadVideoToFile(scene.fallbackVideoUrl, videoPath, {
              label: `scène-${i + 1}-fallback`,
            });
            scene.embeddedAudio = false;
          } else {
            throw dlErr;
          }
        }
      } else {
        console.warn(`[ASSEMBLE] Scène ${i} sans vidéo, skip`);
        continue;
      }

      const vf =
        "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280";

      let useEmbedded = scene.embeddedAudio === true;

      if (useEmbedded) {
        try {
          await execFileAsync(ffmpeg, [
            "-y",
            "-i",
            videoPath,
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            clipPath,
          ]);
        } catch (muxErr) {
          console.warn(
            `[ASSEMBLE] Scène ${i + 1}: embedded audio échoué, fallback mux voix`,
            muxErr instanceof Error ? muxErr.message : muxErr
          );
          useEmbedded = false;
          try {
            fs.unlinkSync(clipPath);
          } catch {
            /* partial clip */
          }
        }
      }

      if (!useEmbedded && scene.audioBase64) {
        const rawAudio = Buffer.from(scene.audioBase64, "base64");
        const wavBuffer = ensureWavBuffer(rawAudio, scene.audioMimeType);
        fs.writeFileSync(audioPath, wavBuffer);

        try {
          await execFileAsync(ffmpeg, [
            "-y",
            "-i",
            videoPath,
            "-i",
            audioPath,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-vf",
            vf,
            "-af",
            "apad",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            clipPath,
          ]);
        } catch (muxError) {
          throw new Error(
            `Mixage voix échoué (scène ${i + 1}): ${
              muxError instanceof Error ? muxError.message : muxError
            }`
          );
        }
      } else if (!useEmbedded) {
        console.warn(
          `[ASSEMBLE] Scène ${i} sans voiceover TTS — export vidéo muette`
        );
        await execFileAsync(ffmpeg, [
          "-y",
          "-i",
          videoPath,
          "-map",
          "0:v:0",
          "-vf",
          vf,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-r",
          "30",
          "-an",
          clipPath,
        ]);
      }

      if (fs.existsSync(clipPath)) {
        clipPaths.push(clipPath);
      }
    }

    if (clipPaths.length === 0) {
      return NextResponse.json(
        { error: "Aucun clip valide généré" },
        { status: 500 }
      );
    }

    if (clipPaths.length === 1) {
      console.log("[ASSEMBLE] 1 seule scène — pas de concat");
      const finalBuffer = fs.readFileSync(clipPaths[0]);
      cleanup(tmpDir);
      return new NextResponse(finalBuffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="pub.mp4"',
        },
      });
    }

    const listPath = path.join(tmpDir, "list.txt");
    const listContent = clipPaths
      .map((clipPath) => `file '${clipPath.replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(listPath, listContent);

    const finalPath = path.join(tmpDir, "final.mp4");
    await execFileAsync(ffmpeg, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      finalPath,
    ]);

    if (!fs.existsSync(finalPath)) {
      return NextResponse.json(
        { error: "Assemblage ffmpeg échoué" },
        { status: 500 }
      );
    }

    const finalBuffer = fs.readFileSync(finalPath);
    cleanup(tmpDir);

    console.log("[ASSEMBLE] ✅ Vidéo finale prête:", finalBuffer.length, "bytes");

    return new NextResponse(finalBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="pub.mp4"',
      },
    });
  } catch (error) {
    console.error("[ASSEMBLE] Erreur:", error);
    cleanup(tmpDir);
    const raw = error instanceof Error ? error.message : "Erreur assemblage";
    let message = raw;
    if (raw.includes("ENOENT") && raw.includes("ffmpeg")) {
      message =
        "FFmpeg introuvable. Redémarre « npm run dev » ou définis FFMPEG_PATH dans .env.local";
    } else if (
      raw.includes("moov atom not found") ||
      raw.includes("Invalid data found")
    ) {
      message =
        "Fichier vidéo invalide (téléchargement incomplet). Réessaie l’étape 4 — le lip sync a peut‑être échoué silencieusement.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
