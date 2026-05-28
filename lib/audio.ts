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
export function looksLikeMp3(buffer: ArrayBuffer | Buffer | Uint8Array): boolean {
  const v =
    buffer instanceof Uint8Array
      ? buffer
      : Buffer.isBuffer(buffer)
        ? buffer
        : new Uint8Array(buffer);
  if (v.length < 3) return false;
  if (v[0] === 0x49 && v[1] === 0x44 && v[2] === 0x33) return true; // ID3
  return v[0] === 0xff && (v[1] & 0xe0) === 0xe0;
}

export function looksLikeWav(buffer: Buffer | Uint8Array): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  );
}

/** Extrait le sample rate depuis audio/L16;codec=pcm;rate=24000 */
export function parsePcmSampleRate(mimeType?: string | null): number {
  if (!mimeType) return 24000;
  const rateMatch = mimeType.match(/rate=(\d+)/i);
  return rateMatch ? parseInt(rateMatch[1], 10) : 24000;
}

/** Gemini TTS = PCM 16-bit LE sans header — on ajoute l'en-tête WAV. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

/** Retourne un Buffer WAV valide (convertit le PCM Gemini si besoin). */
export function ensureWavBuffer(
  audioBytes: Buffer,
  mimeType?: string | null
): Buffer {
  if (looksLikeWav(audioBytes)) return audioBytes;
  return pcmToWav(audioBytes, parsePcmSampleRate(mimeType));
}
