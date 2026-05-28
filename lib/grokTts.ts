/** Voix Gemini (legacy) → voix Grok xAI */
export const LEGACY_GEMINI_VOICE_MAP: Record<string, string> = {
  Aoede: "ara",
  Leda: "eve",
  Zephyr: "ara",
  Orus: "rex",
  Puck: "leo",
  Charon: "sal",
  Fenrir: "leo",
  Kore: "eve",
};

export function styleTextForGrokEmotion(
  text: string,
  emotion?: string,
  narrativeRole?: string
): string {
  const role = narrativeRole?.toLowerCase();
  if (role === "problem") return `[sigh] ${text}`;
  if (role === "discovery") return text;
  if (role === "solution") return `[laugh] ${text}`;

  if (!emotion) return text;
  const e = emotion.toLowerCase();
  if (e === "excited" || e === "energetic" || e === "triumphant") {
    return `[laugh] ${text}`;
  }
  if (e === "whisper" || e === "intimate" || e === "empathy") return text;
  if (e === "dramatic" || e === "sad" || e === "mysterious") {
    return e === "mysterious" ? text : `[sigh] ${text}`;
  }
  if (e === "happy") return text;
  return text;
}

export async function generateGrokSpeech(
  text: string,
  voiceId: string,
  language = "fr"
): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("GROK_API_KEY manquante");
  }

  const voice = voiceId.toLowerCase();

  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voice,
      language,
      output_format: {
        codec: "wav",
        sample_rate: 24000,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok TTS erreur ${response.status}: ${err.slice(0, 400)}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (audioBuffer.length === 0) {
    throw new Error("Grok TTS: réponse audio vide");
  }

  const contentType = response.headers.get("content-type") || "audio/wav";
  const mimeType = contentType.includes("wav")
    ? "audio/wav"
    : contentType.includes("mpeg") || contentType.includes("mp3")
      ? "audio/mpeg"
      : "audio/wav";

  console.log(
    "[GROK-TTS] OK voice=",
    voice,
    "lang=",
    language,
    "bytes=",
    audioBuffer.length
  );

  return {
    audioBase64: audioBuffer.toString("base64"),
    mimeType,
    provider: "grok-tts" as const,
    voiceId: voice,
  };
}
