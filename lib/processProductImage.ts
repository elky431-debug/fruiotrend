const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const COMPRESS_IF_LARGER_THAN = 2 * 1024 * 1024;

function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  return "image/jpeg";
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (/\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name)) return true;
  // Windows : type MIME souvent vide après sélection
  if (!file.type && file.size > 0) return true;
  return false;
}

function isHeic(file: File): boolean {
  return (
    /heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name)
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Lecture du fichier impossible"));
    };
    reader.onerror = () =>
      reject(new Error(`Impossible de lire « ${file.name} »`));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(
  dataUrl: string,
  maxDim: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (result: string) => {
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => done(dataUrl), 12_000);

    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height, 1));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          done(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        done(canvas.toDataURL("image/jpeg", quality));
      } catch {
        done(dataUrl);
      }
    };

    img.onerror = () => done(dataUrl);
    img.src = dataUrl;
  });
}

function dataUrlToResult(
  dataUrl: string,
  fallbackMime: string
): { base64: string; mimeType: string; previewUrl: string } {
  const mimeType =
    dataUrl.match(/^data:([^;]+);/i)?.[1] || fallbackMime || "image/jpeg";
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Échec de conversion de l'image.");
  }
  return { base64, mimeType, previewUrl: dataUrl };
}

export type ProcessedProductImage = {
  base64: string;
  mimeType: string;
  previewUrl: string;
};

/** Lit et prépare une photo produit (compression optionnelle). */
export async function processProductImageFile(
  file: File
): Promise<ProcessedProductImage> {
  if (!isImageFile(file)) {
    throw new Error(
      `« ${file.name} » n'est pas une image. Utilisez JPG, PNG ou WebP.`
    );
  }

  if (isHeic(file)) {
    throw new Error(
      "Format HEIC non supporté. Exportez en JPG (iPhone : Réglages → Appareil photo → Le plus compatible)."
    );
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Fichier trop lourd (max 25 Mo).");
  }

  const fallbackMime = file.type || mimeFromName(file.name);
  const dataUrl = await readFileAsDataUrl(file);

  let finalUrl = dataUrl;
  if (file.size > COMPRESS_IF_LARGER_THAN) {
    finalUrl = await compressDataUrl(dataUrl, MAX_DIMENSION, JPEG_QUALITY);
  }

  return dataUrlToResult(finalUrl, fallbackMime);
}

export function filterImageFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(isImageFile);
}
