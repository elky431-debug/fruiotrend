import { NextRequest, NextResponse } from "next/server";
import { requireCredits } from "@/lib/apiCredits";
import { generateGrokSpeech, normalizeGrokVoiceId } from "@/lib/grokTts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const creditGuard = await requireCredits(req, "voice");
    if (creditGuard instanceof NextResponse) return creditGuard;

    const { text, emotion, voiceName, narrativeRole } = await req.json();

    if (!process.env.GROK_API_KEY) {
      return NextResponse.json(
        { error: "GROK_API_KEY manquante" },
        { status: 500 }
      );
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    const finalVoice = normalizeGrokVoiceId(voiceName);

    console.log(
      "[VOICE] Grok TTS —",
      finalVoice,
      "|",
      String(text).trim().substring(0, 80)
    );

    const result = await generateGrokSpeech(String(text), finalVoice, {
      emotion,
      narrativeRole,
    });

    console.log("[VOICE] ✅ Audio généré");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[VOICE] Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur voix" },
      { status: 500 }
    );
  }
}
