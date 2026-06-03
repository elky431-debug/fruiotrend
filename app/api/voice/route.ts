import { NextRequest, NextResponse } from "next/server";
import { requireCredits } from "@/lib/apiCredits";
import {
  generateSpeechWithFallback,
  resolveTtsVoiceIds,
} from "@/lib/generateSpeech";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const creditGuard = await requireCredits(req, "voice");
    if (creditGuard instanceof NextResponse) return creditGuard;

    const { text, emotion, voiceName, narrativeRole, productType } =
      await req.json();
    const preferElevenLabs =
      productType === "app" || process.env.TTS_PREFER_ELEVENLABS === "true";

    if (!process.env.GROK_API_KEY && !process.env.FAL_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configure GROK_API_KEY ou FAL_API_KEY dans .env.local pour la voix.",
        },
        { status: 500 }
      );
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    console.log("[VOICE] Voix reçue:", voiceName);
    console.log("[VOICE] Texte:", String(text).trim().substring(0, 50));

    const { uiId, grokId, elevenId } = resolveTtsVoiceIds(voiceName);
    console.log("[VOICE] Voix finale — UI:", uiId, "| Grok:", grokId, "| Eleven:", elevenId);

    const result = await generateSpeechWithFallback(
      String(text),
      voiceName || uiId,
      {
        emotion,
        narrativeRole,
        preferElevenLabs,
      }
    );

    console.log(
      "[VOICE] ✅ Audio généré via",
      result.provider,
      "| voiceId:",
      result.voiceId
    );
    return NextResponse.json({
      ...result,
      usedVoiceId: result.voiceId,
      requestedVoice: voiceName || null,
    });
  } catch (error) {
    console.error("[VOICE] Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur voix" },
      { status: 500 }
    );
  }
}
