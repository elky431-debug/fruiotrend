/** Decode base64 audio to a blob URL (revoke with URL.revokeObjectURL when done). */
export function base64ToBlobUrl(
  base64: string,
  mimeType = "audio/mpeg"
): string {
  const normalized =
    mimeType === "audio/mp3" ? "audio/mpeg" : mimeType;
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: normalized }));
}

/** MP3 frame sync or ID3 tag */
export function looksLikeMp3(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 3) return false;
  const v = new Uint8Array(buffer);
  if (v[0] === 0x49 && v[1] === 0x44 && v[2] === 0x33) return true; // ID3
  return v[0] === 0xff && (v[1] & 0xe0) === 0xe0;
}
