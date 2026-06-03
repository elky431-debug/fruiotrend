import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { resolveFfmpegPath, isFfmpegAvailable } from "@/lib/ffmpeg";
import { downloadVideoToFile } from "@/lib/videoFetch";
import { uploadVideoToFal } from "@/lib/lipsyncFal";
import { falMergeVideos, fetchVideoBuffer } from "@/lib/falFfmpeg";

const execFileAsync = promisify(execFile);
export const maxDuration = 300;
export const runtime = "nodejs";

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Concatène plusieurs segments vidéo LTX (≤20s chacun) en une seule vidéo
 * continue, puis l'héberge sur fal et renvoie son URL. Sert à produire des
 * pubs de 30s+ alors que LTX plafonne à 20s par clip.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { clipUrls?: string[] };
  const clipUrls = (body.clipUrls || []).filter(Boolean);

  if (clipUrls.length === 0) {
    return NextResponse.json({ error: "Aucun clip fourni" }, { status: 400 });
  }

  // Un seul segment : rien à concaténer.
  if (clipUrls.length === 1) {
    return NextResponse.json({ videoUrl: clipUrls[0] });
  }

  if (!isFfmpegAvailable()) {
    try {
      const mergedUrl = await falMergeVideos(clipUrls);
      console.log("[VIDEO/CONCAT] cloud ✅", mergedUrl.slice(0, 70));
      return NextResponse.json({ videoUrl: mergedUrl });
    } catch (error) {
      console.error("[VIDEO/CONCAT] cloud:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Concaténation vidéo échouée",
        },
        { status: 500 }
      );
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pubmoi-concat-"));
  const ffmpeg = resolveFfmpegPath();
  const vf = "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280";

  try {
    const normalizedPaths: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const clipPath = path.join(tmpDir, `seg_${i}.mp4`);
      await downloadVideoToFile(clipUrls[i], clipPath, { label: `seg-${i}` });

      const normPath = path.join(tmpDir, `norm_${i}.mp4`);
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
        normPath,
      ]);
      normalizedPaths.push(normPath);
    }

    const listPath = path.join(tmpDir, "list.txt");
    fs.writeFileSync(
      listPath,
      normalizedPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n")
    );

    const finalPath = path.join(tmpDir, "concat.mp4");
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

    const buffer = fs.readFileSync(finalPath);
    const apiKey = process.env.FAL_API_KEY;
    const hostedUrl = apiKey
      ? await uploadVideoToFal(apiKey, buffer)
      : null;

    cleanup(tmpDir);

    if (!hostedUrl) {
      return NextResponse.json(
        { error: "Hébergement de la vidéo concaténée échoué" },
        { status: 500 }
      );
    }

    console.log(
      "[VIDEO/CONCAT] ✅",
      clipUrls.length,
      "segments →",
      hostedUrl.slice(0, 70)
    );
    return NextResponse.json({ videoUrl: hostedUrl });
  } catch (error) {
    cleanup(tmpDir);
    console.error("[VIDEO/CONCAT]", error);
    const raw = error instanceof Error ? error.message : "Erreur concaténation";
    const message =
      raw.includes("ENOENT") && raw.includes("ffmpeg")
        ? "FFmpeg introuvable. Redémarre le serveur ou définis FFMPEG_PATH."
        : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
