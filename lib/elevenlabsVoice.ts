import { looksLikeMp3 } from "@/lib/audio";
import { parseFalBillingError } from "@/lib/klingFal";

/**
 * Voix VALIDES de l'endpoint fal `fal-ai/elevenlabs/tts/eleven-v3`.
 * (param attendu = `voice`, pas `voice_id`)
 * Liste officielle : Aria, Roger, Sarah, Laura, Charlie, George, Callum,
 * River, Liam, Charlotte, Alice, Matilda, Will, Jessica, Eric, Chris,
 * Brian, Daniel, Lily, Bill.
 */
const VALID_ELEVEN_VOICES = [
  "Aria",
  "Roger",
  "Sarah",
  "Laura",
  "Charlie",
  "George",
  "Callum",
  "River",
  "Liam",
  "Charlotte",
  "Alice",
  "Matilda",
  "Will",
  "Jessica",
  "Eric",
  "Chris",
  "Brian",
  "Daniel",
  "Lily",
  "Bill",
] as const;

const VOICE_ID_SET = new Set<string>(VALID_ELEVEN_VOICES);

/** ID voix UI (lib/voices.ts) → voix fal ElevenLabs valide et DISTINCTE */
const UI_TO_ELEVEN: Record<string, string> = {
  eve: "Sarah", // F chaleureuse
  aria: "Aria", // F claire dynamique
  luna: "Charlotte", // F douce
  nova: "Laura", // F énergique
  leo: "Liam", // H jeune dynamique
  rex: "George", // H grave autoritaire
  atlas: "Will", // H profond premium
  orion: "Roger", // H posé professionnel
  // anciens alias éventuels
  ara: "Sarah",
  sal: "Laura",
};

/** Liste exposée (compat) — basée sur le mapping UI */
export const ELEVENLABS_VOICES = Object.entries(UI_TO_ELEVEN)
  .filter(([id]) => ["eve", "aria", "luna", "nova", "leo", "rex", "atlas", "orion"].includes(id))
  .map(([id, falVoice]) => ({ id, falVoice }));

export function normalizeElevenVoiceId(voiceName?: string): string {
  if (!voiceName) return "Sarah";
  const lower = voiceName.trim().toLowerCase();

  if (UI_TO_ELEVEN[lower]) return UI_TO_ELEVEN[lower];

  const validMatch = VALID_ELEVEN_VOICES.find(
    (v) => v.toLowerCase() === lower
  );
  if (validMatch) return validMatch;

  return "Sarah";
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

  console.log(
    "[ELEVENLABS] Requête fal — voice:",
    finalVoice,
    "(demandée:",
    voiceId,
    ")"
  );

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
        voice: finalVoice,
        stability: 0.5,
        language_code: "fr",
        apply_text_normalization: "auto",
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
