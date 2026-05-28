import type { VoiceOption } from "@/lib/voices";

type XaiVoice = {
  voice_id: string;
  name: string;
  language?: string | null;
  gender?: string | null;
};

const GENDER_EMOJI: Record<string, string> = {
  female: "👩",
  male: "👨",
  neutral: "🎙️",
};

function voiceDescription(v: XaiVoice): string {
  const parts: string[] = [];
  if (v.gender) {
    parts.push(
      v.gender === "female"
        ? "Féminine"
        : v.gender === "male"
          ? "Masculine"
          : "Neutre"
    );
  }
  if (v.language) {
    parts.push(v.language === "multilingual" ? "Multilingue" : v.language);
  }
  return parts.join(" · ") || "Voix Grok";
}

function toVoiceOption(v: XaiVoice): VoiceOption {
  const gender =
    v.gender === "female" || v.gender === "male" || v.gender === "neutral"
      ? v.gender
      : "neutral";

  return {
    id: v.voice_id.toLowerCase(),
    name: v.name || v.voice_id,
    gender,
    description: voiceDescription(v),
    emoji: GENDER_EMOJI[gender] || "🔊",
    tags: [],
  };
}

/** Voix disponibles sur le compte xAI (souvent 70+). */
export async function fetchGrokVoicesFromApi(): Promise<VoiceOption[]> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("GROK_API_KEY manquante");
  }

  const response = await fetch("https://api.x.ai/v1/tts/voices", {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Liste voix Grok: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as { voices?: XaiVoice[] };
  const voices = data.voices || [];

  const sorted = [...voices].sort((a, b) => {
    const preset = ["eve", "ara", "rex", "sal", "leo"];
    const ai = preset.indexOf(a.voice_id.toLowerCase());
    const bi = preset.indexOf(b.voice_id.toLowerCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (a.name || a.voice_id).localeCompare(b.name || b.voice_id);
  });

  return sorted.map(toVoiceOption);
}
