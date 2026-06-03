import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ensureWavBuffer } from "@/lib/audio";
import { assembleScenesCloud } from "@/lib/assembleCloud";
import { falMergeVideos, fetchVideoBuffer } from "@/lib/falFfmpeg";
import { isFfmpegAvailable, resolveFfmpegPath } from "@/lib/ffmpeg";
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

/**
 * Mesure la durée d'un média en secondes via `ffmpeg -i` (parse stderr).
 * Pas de ffprobe disponible — ffmpeg sort en erreur sans fichier de sortie
 * mais imprime "Duration: HH:MM:SS.ss" sur stderr.
 */
async function probeDurationSeconds(
  ffmpeg: string,
  file: string
): Promise<number | null> {
  try {
    await execFileAsync(ffmpeg, ["-i", file]);
    return null;
  } catch (e) {
    const stderr =
      e && typeof e === "object" && "stderr" in e
        ? String((e as { stderr?: unknown }).stderr ?? "")
        : "";
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const seconds =
      Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }
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
      if (!isFfmpegAvailable()) {
        const mergedUrl =
          clipUrls.length === 1
            ? clipUrls[0]
            : await falMergeVideos(clipUrls);
        const buffer = await fetchVideoBuffer(mergedUrl);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": 'attachment; filename="pub.mp4"',
          },
        });
      }
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

    // Netlify / serverless : pas de binaire ffmpeg → assemblage cloud fal.
    if (!isFfmpegAvailable()) {
      console.log("[ASSEMBLE] Fallback cloud (sans ffmpeg local)");
      const finalBuffer = await assembleScenesCloud(scenes);
      return new NextResponse(new Uint8Array(finalBuffer), {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="pub.mp4"',
        },
      });
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

      if (scene.audioBase64) {
        const rawAudio = Buffer.from(scene.audioBase64, "base64");
        const wavBuffer = ensureWavBuffer(rawAudio, scene.audioMimeType);
        fs.writeFileSync(audioPath, wavBuffer);

        // Choix du filtre vidéo :
        // - Vidéo déjà synchronisée (lip sync) : la bouche est déjà calée sur
        //   la voix → on NE time-stretch PAS, simple mux 1:1 + tpad sécurité.
        // - Vidéo muette (fallback) : on cale la durée de la vidéo sur celle de
        //   la voix (setpts) pour que le perso "parle" pendant toute la voix.
        let vfWithPad = `${vf},tpad=stop_mode=clone:stop_duration=2`;
        if (!scene.embeddedAudio) {
          const audioDur = await probeDurationSeconds(ffmpeg, audioPath);
          const videoDur = await probeDurationSeconds(ffmpeg, videoPath);
          vfWithPad = `${vf},tpad=stop_mode=clone:stop_duration=30`;
          if (audioDur && videoDur && audioDur > 0.3 && videoDur > 0.3) {
            const ratio = audioDur / videoDur;
            if (ratio >= 0.5 && ratio <= 2.5) {
              vfWithPad = `${vf},setpts=${ratio.toFixed(
                4
              )}*PTS,tpad=stop_mode=clone:stop_duration=2`;
              console.log(
                `[ASSEMBLE] Scène ${i + 1}: time-stretch vidéo ×${ratio.toFixed(
                  2
                )} (voix ${audioDur.toFixed(1)}s / vidéo ${videoDur.toFixed(1)}s)`
              );
            } else if (ratio > 2.5) {
              vfWithPad = `${vf},tpad=stop_mode=clone:stop_duration=30`;
            } else {
              vfWithPad = vf;
            }
          }
        }

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
            vfWithPad,
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
      } else {
        console.warn(
          `[ASSEMBLE] Scène ${i} sans voiceover TTS — export vidéo muette (audio modèle ignoré)`
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
