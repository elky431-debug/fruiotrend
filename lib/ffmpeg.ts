import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));

/**
 * Chemin absolu vers ffmpeg.exe (ou binaire système).
 * Ne pas bundler — résolution au runtime via serverComponentsExternalPackages.
 */
export function resolveFfmpegPath(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    throw new Error(`FFMPEG_PATH introuvable : ${fromEnv}`);
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

  throw new Error(
    "FFmpeg introuvable. Lance « npm install » puis redémarre le serveur, ou ajoute FFMPEG_PATH dans .env.local"
  );
}
