import { looksLikeMp3 } from "@/lib/audio";
import { parseFalBillingError } from "@/lib/klingFal";

export const ELEVENLABS_VOICES = [
  {
    id: "Rachel",
    name: "Rachel",
    gender: "female" as const,
    description: "Chaleureuse & naturelle",
    emoji: "👩",
    tags: ["beauté", "lifestyle"],
  },
  {
    id: "Bella",
    name: "Bella",
    gender: "female" as const,
    description: "Douce & persuasive",
    emoji: "🌸",
    tags: ["luxe", "beauté"],
  },
  {
    id: "Elli",
    name: "Elli",
    gender: "female" as const,
    description: "Jeune & énergique",
    emoji: "✨",
    tags: ["sport", "mode"],
  },
  {
    id: "Domi",
    name: "Domi",
    gender: "female" as const,
    description: "Claire & dynamique",
    emoji: "💁‍♀️",
    tags: ["tech", "gadgets"],
  },
  {
    id: "Antoni",
    name: "Antoni",
    gender: "male" as const,
    description: "Posé & professionnel",
    emoji: "🎙️",
    tags: ["business", "tech"],
  },
  {
    id: "Josh",
    name: "Josh",
    gender: "male" as const,
    description: "Jeune & dynamique",
    emoji: "🧑",
    tags: ["sport", "gaming"],
  },
  {
    id: "Arnold",
    name: "Arnold",
    gender: "male" as const,
    description: "Grave & autoritaire",
    emoji: "💪",
    tags: ["sport", "fitness"],
  },
  {
    id: "Adam",
    name: "Adam",
    gender: "male" as const,
    description: "Profond & dramatique",
    emoji: "🎭",
    tags: ["luxe", "premium"],
  },
];

const VOICE_ID_SET = new Set(ELEVENLABS_VOICES.map((v) => v.id));

export function normalizeElevenVoiceId(voiceName?: string): string {
  if (!voiceName) return "Rachel";
  const exact = ELEVENLABS_VOICES.find((v) => v.id === voiceName);
  if (exact) return exact.id;
  const ci = ELEVENLABS_VOICES.find(
    (v) => v.id.toLowerCase() === voiceName.toLowerCase()
  );
  if (ci) return ci.id;
  const legacy: Record<string, string> = {
    ara: "Rachel",
    eve: "Elli",
    rex: "Antoni",
    leo: "Adam",
    sal: "Domi",
  };
  return legacy[voiceName.toLowerCase()] || "Rachel";
}

/** Préfixe ElevenLabs uniquement — le texte du script n'est pas modifié */
export function applyEmotionTags(
  text: string,
  emotion?: string,
  narrativeRole?: string
): string {
  const trimmed = text.trim();
  const emotionPrefix: Record<string, string> = {
    problem: "[whispers] ",
    discovery: "",
    solution: "[excited] ",
    excited: "[excited] ",
    dramatic: "[sad] ",
    whisper: "[whispers] ",
    happy: "[happy] ",
    intense: "[excited] ",
    triumphant: "[excited] ",
    empathy: "[whispers] ",
    mysterious: "[mysterious] ",
    intimate: "[whispers] ",
  };

  const prefix =
    (narrativeRole && emotionPrefix[narrativeRole]) ||
    (emotion && emotionPrefix[emotion]) ||
    "";

  return `${prefix}${trimmed}`;
}

export async function generateElevenLabsSpeech(
  text: string,
  voiceId: string
): Promise<{
  audioBase64: string;
  mimeType: string;
  audioUrl?: string;
  provider: "elevenlabs-fal";
  voiceId: string;
}> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error("FAL_API_KEY manquante dans .env.local");
  }

  const finalVoice = normalizeElevenVoiceId(voiceId);
  if (!VOICE_ID_SET.has(finalVoice)) {
    throw new Error(`Voix invalide: ${voiceId}`);
  }

  const response = await fetch(
    "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        voice_id: finalVoice,
        language_code: "fr",
        output_format: "mp3_44100_128",
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    const billingMsg = parseFalBillingError(err);
    if (billingMsg) {
      throw new Error(billingMsg);
    }
    throw new Error(`ElevenLabs erreur (${response.status}): ${err.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    audio?: { url?: string };
    url?: string;
    audio_url?: string;
  };

  const audioUrl = data.audio?.url || data.url || data.audio_url;
  if (!audioUrl) {
    throw new Error("Pas d'URL audio retournée par fal.ai");
  }

  const audioRes = await fetch(audioUrl);
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

  if (!looksLikeMp3(audioBuffer)) {
    console.warn("[VOICE] Réponse audio non-MP3 détectée, envoi tel quel");
  }

  return {
    audioBase64: audioBuffer.toString("base64"),
    mimeType: "audio/mp3",
    audioUrl,
    provider: "elevenlabs-fal",
    voiceId: finalVoice,
  };
}
