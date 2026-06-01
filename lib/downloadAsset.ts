/** Télécharge un fichier depuis une data URL ou une URL http(s). */
export function downloadDataUrlAsFile(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function extensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/i);
  if (!match) return "png";
  const mime = match[1].toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "png";
}

export function slugifyFilename(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "pubmoi"
  );
}

export function sceneImageFilename(
  productName: string,
  sceneIndex: number,
  dataUrl: string
): string {
  const base = slugifyFilename(productName);
  const ext = extensionFromDataUrl(dataUrl);
  return `${base}-scene-${sceneIndex + 1}.${ext}`;
}

/** Déclenche plusieurs téléchargements avec un léger délai (évite le blocage navigateur). */
export async function downloadAllWithDelay(
  items: { dataUrl: string; filename: string }[]
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    downloadDataUrlAsFile(items[i].dataUrl, items[i].filename);
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
