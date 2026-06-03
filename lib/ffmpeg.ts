import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));

const SERVERLESS_COPY = path.join(os.tmpdir(), "pubmoi-ffmpeg");

function copyForServerless(source: string): string {
  try {
    if (!fs.existsSync(SERVERLESS_COPY)) {
      fs.copyFileSync(source, SERVERLESS_COPY);
      fs.chmodSync(SERVERLESS_COPY, 0o755);
    }
    return SERVERLESS_COPY;
  } catch {
    return source;
  }
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL
  );
}

function locateFfmpegBinary(): string | null {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    return null;
  }

  try {
    const installer = require("@ffmpeg-installer/ffmpeg") as { path?: string };
    if (installer?.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
  } catch {
    /* essai suivant */
  }

  try {
    const ffmpegStatic = require("ffmpeg-static") as string | undefined;
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    /* essai suivant */
  }

  const cwd = process.cwd();
  const platform =
    process.platform === "win32"
      ? "win32-x64"
      : process.platform === "darwin"
        ? process.arch === "arm64"
          ? "darwin-arm64"
          : "darwin-x64"
        : "linux-x64";

  const fallbacks = [
    path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", platform, "ffmpeg.exe"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", platform, "ffmpeg"),
  ];

  for (const candidate of fallbacks) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

/** Retourne le chemin ffmpeg ou null (sans throw). */
export function tryResolveFfmpegPath(): string | null {
  const found = locateFfmpegBinary();
  if (!found) return null;
  return isServerlessRuntime() ? copyForServerless(found) : found;
}

/**
 * Chemin absolu vers ffmpeg. Throw si introuvable — préférer tryResolveFfmpegPath
 * + fallback cloud (lib/falFfmpeg) en production serverless.
 */
export function resolveFfmpegPath(): string {
  const found = tryResolveFfmpegPath();
  if (found) return found;

  throw new Error(
    "FFmpeg introuvable. Lance « npm install » puis redémarre le serveur, ou ajoute FFMPEG_PATH dans .env.local"
  );
}

export function isFfmpegAvailable(): boolean {
  return tryResolveFfmpegPath() !== null;
}
