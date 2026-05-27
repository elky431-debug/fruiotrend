import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
export const maxDuration = 300;

type SceneInput = {
  videoUrl?: string | null;
  videoBase64?: string | null;
  audioBase64?: string | null;
  audioMimeType?: string | null;
};

function getFfmpeg(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch {}
  return "ffmpeg";
}

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

async function getVideoDuration(ffmpeg: string, videoPath: string): Promise<number> {
  try {
    await execFileAsync(ffmpeg, ["-i", videoPath]);
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr || "")
        : "";
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }
  return 10;
}

export async function POST(req: NextRequest) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adcreative-"));

  try {
    const { scenes } = (await req.json()) as { scenes: SceneInput[] };

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: "Aucune scène fournie" },
        { status: 400 }
      );
    }

    const ffmpeg = getFfmpeg();
    const clipPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const videoPath = path.join(tmpDir, `video_${i}.mp4`);
      const audioExt =
        scene.audioMimeType?.includes("wav") ? "wav" : "mp3";
      const audioPath = path.join(tmpDir, `audio_${i}.${audioExt}`);
      const clipPath = path.join(tmpDir, `clip_${i}.mp4`);

      if (scene.videoBase64) {
        fs.writeFileSync(videoPath, Buffer.from(scene.videoBase64, "base64"));
      } else if (scene.videoUrl) {
        const res = await fetch(scene.videoUrl);
        const buf = await res.arrayBuffer();
        fs.writeFileSync(videoPath, Buffer.from(buf));
      } else {
        console.warn(`[ASSEMBLE] Scène ${i} sans vidéo, skip`);
        continue;
      }

      if (scene.audioBase64) {
        fs.writeFileSync(audioPath, Buffer.from(scene.audioBase64, "base64"));
        const videoDuration = await getVideoDuration(ffmpeg, videoPath);

        await execFileAsync(ffmpeg, [
          "-y",
          "-i",
          videoPath,
          "-i",
          audioPath,
          "-vf",
          "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
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
          "-t",
          `${videoDuration}`,
          clipPath,
        ]);
      } else {
        await execFileAsync(ffmpeg, [
          "-y",
          "-i",
          videoPath,
          "-vf",
          "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur assemblage" },
      { status: 500 }
    );
  }
}
