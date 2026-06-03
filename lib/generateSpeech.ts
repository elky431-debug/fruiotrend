import {
  applyEmotionTags,
  generateElevenLabsSpeech,
  normalizeElevenVoiceId,
} from "@/lib/elevenlabsVoice";
import { generateGrokSpeech, normalizeGrokVoiceId } from "@/lib/grokTts";
import { normalizeVoiceId } from "@/lib/voices";

export type SpeechResult = {
  audioBase64: string;
  mimeType: string;
  provider: "grok-tts-aurora" | "elevenlabs-fal";
  voiceId: string;
  audioUrl?: string;
};

function isGrokAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("permission") ||
    lower.includes("not authorized") ||
    lower.includes("not have permission")
  );
}

/** ID voix UI (eve, leo…) → IDs providers */
export function resolveTtsVoiceIds(voiceName?: string) {
  const uiId = normalizeVoiceId(voiceName) || normalizeGrokVoiceId(voiceName);
  return {
    uiId,
    grokId: normalizeGrokVoiceId(uiId),
    elevenId: normalizeElevenVoiceId(uiId),
  };
}

/** Grok TTS si disponible, sinon ElevenLabs via fal.ai */
export async function generateSpeechWithFallback(
  text: string,
  voiceName: string,
  opts?: {
    emotion?: string;
    narrativeRole?: string;
    /** Pubs appli / Pixar — ElevenLabs a des timbres plus distincts que Grok */
    preferElevenLabs?: boolean;
  }
): Promise<SpeechResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Texte voiceover vide");
  }

  const { uiId, grokId, elevenId } = resolveTtsVoiceIds(voiceName);
  console.log(
    "[SPEECH] Voix demandée:",
    voiceName,
    "→ UI:",
    uiId,
    "| Grok:",
    grokId,
    "| Eleven:",
    elevenId,
    opts?.preferElevenLabs ? "| mode: ElevenLabs prioritaire" : ""
  );

  if (opts?.preferElevenLabs && process.env.FAL_API_KEY) {
    const styled = applyEmotionTags(
      trimmed,
      opts?.emotion,
      opts?.narrativeRole
    );
    const eleven = await generateElevenLabsSpeech(styled, elevenId);
    console.log("[SPEECH] ElevenLabs prioritaire — voix:", eleven.voiceId);
    return { ...eleven, voiceId: uiId };
  }

  if (process.env.GROK_API_KEY) {
    try {
      const grok = await generateGrokSpeech(trimmed, grokId, opts);
      return { ...grok, voiceId: uiId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!isGrokAuthError(msg) || !process.env.FAL_API_KEY) {
        throw err;
      }
      console.warn(
        "[SPEECH] Grok TTS refusé (permissions), fallback ElevenLabs —",
        msg.slice(0, 160)
      );
    }
  }

  if (!process.env.FAL_API_KEY) {
    if (process.env.GROK_API_KEY) {
      throw new Error(
        "La voix PubMoi est temporairement indisponible. Réessaie dans quelques instants."
      );
    }
    throw new Error(
      "La voix PubMoi est temporairement indisponible. Réessaie dans quelques instants."
    );
  }

  const styled = applyEmotionTags(
    trimmed,
    opts?.emotion,
    opts?.narrativeRole
  );
  const eleven = await generateElevenLabsSpeech(styled, elevenId);
  return { ...eleven, voiceId: uiId };
}
