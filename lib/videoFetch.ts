/** Télécharge et valide un MP4 avant FFmpeg */

const MIN_BYTES = 8_000;

export function bufferLooksLikeMp4(buf: Buffer): boolean {
  if (buf.length < MIN_BYTES) return false;
  const head = buf.subarray(0, Math.min(buf.length, 32));
  if (head.includes(Buffer.from("ftyp"))) return true;
  if (head.slice(0, 4).toString("ascii") === "ftyp") return true;
  return false;
}

export async function downloadVideoToFile(
  url: string,
  destPath: string,
  opts?: { retries?: number; label?: string }
): Promise<void> {
  const retries = opts?.retries ?? 3;
  const label = opts?.label || "video";
  let lastErr = "téléchargement échoué";

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      console.log(`[VIDEO/FETCH] Retry ${attempt + 1}/${retries} — ${label}`);
    }

    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "video/*,*/*" },
      });

      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json") || ct.includes("text/html")) {
        lastErr = `type invalide: ${ct}`;
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (!bufferLooksLikeMp4(buf)) {
        lastErr = `fichier invalide (${buf.length} bytes, pas MP4)`;
        console.warn(
          `[VIDEO/FETCH] ${label} invalide, début:`,
          buf.subarray(0, 40).toString("utf8").replace(/\s/g, ".")
        );
        continue;
      }

      const fs = await import("node:fs");
      fs.writeFileSync(destPath, buf);
      console.log(`[VIDEO/FETCH] ✅ ${label}: ${buf.length} bytes`);
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(
    `Vidéo ${label} illisible (${lastErr}). Réessaie la génération.`
  );
}
