/** Voix Gemini (legacy) → voix Grok xAI */
export const LEGACY_GEMINI_VOICE_MAP: Record<string, string> = {
  Aoede: "eve",
  Leda: "eve",
  Zephyr: "aria",
  Orus: "rex",
  Puck: "leo",
  Charon: "sal",
  Fenrir: "leo",
  Kore: "eve",
  Rachel: "eve",
  Bella: "luna",
  Elli: "aria",
  Domi: "nova",
  Antoni: "atlas",
  Josh: "leo",
  Adam: "orion",
  Sam: "rex",
};

export function applyEmotionStyle(
  text: string,
  emotion?: string,
  narrativeRole?: string
): string {
  if (narrativeRole === "problem" || emotion === "empathy" || emotion === "dramatic") {
    return text;
  }
  if (narrativeRole === "solution" || emotion === "excited" || emotion === "triumphant") {
    return text;
  }
  return text;
}

export function normalizeGrokVoiceId(voiceName?: string): string {
  if (!voiceName?.trim()) return "eve";
  const id = voiceName.trim().toLowerCase();
  const legacy = LEGACY_GEMINI_VOICE_MAP[voiceName.trim()];
  if (legacy) return legacy;
  return id;
}

export async function generateGrokSpeech(
  text: string,
  voiceId: string,
  opts?: {
    emotion?: string;
    narrativeRole?: string;
  }
): Promise<{
  audioBase64: string;
  mimeType: string;
  provider: "grok-tts-aurora";
  voiceId: string;
}> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("Voix PubMoi temporairement indisponible.");
  }

  const voice = normalizeGrokVoiceId(voiceId);
  const styledText = applyEmotionStyle(
    text.trim(),
    opts?.emotion,
    opts?.narrativeRole
  );

  const response = await fetch("https://api.x.ai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-tts-aurora",
      input: styledText,
      voice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    // On inclut le statut HTTP dans le message pour que la logique de fallback
    // (isGrokAuthError) puisse détecter un refus d'autorisation et basculer
    // sur ElevenLabs. Ce message reste interne (catché par le fallback).
    throw new Error(`Grok TTS HTTP ${response.status}: ${err.slice(0, 200)}`);
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    throw new Error("La voix PubMoi n'a pas pu être générée. Réessaie.");
  }

  console.log(
    "[GROK-TTS] OK voice=",
    voice,
    "|",
    styledText.substring(0, 80),
    "bytes=",
    audioBuffer.byteLength
  );

  return {
    audioBase64: Buffer.from(audioBuffer).toString("base64"),
    mimeType: "audio/mp3",
    provider: "grok-tts-aurora",
    voiceId: voice,
  };
}
