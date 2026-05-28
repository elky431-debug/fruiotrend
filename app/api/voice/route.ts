import { NextRequest, NextResponse } from "next/server";
import {
  applyEmotionTags,
  generateElevenLabsSpeech,
  normalizeElevenVoiceId,
} from "@/lib/elevenlabsVoice";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, emotion, voiceName, narrativeRole, durationSeconds } =
      await req.json();

    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "FAL_API_KEY manquante dans .env.local" },
        { status: 500 }
      );
    }

    if (!text || String(text).trim() === "") {
      return NextResponse.json({ error: "Texte voiceover vide" }, { status: 400 });
    }

    const finalVoice = normalizeElevenVoiceId(voiceName);
    const finalText = applyEmotionTags(String(text), emotion, narrativeRole);

    console.log("[VOICE] Texte à lire:", finalText);
    console.log(
      "[VOICE] Voix:",
      finalVoice,
      durationSeconds ? `| ~${durationSeconds}s` : ""
    );

    const result = await generateElevenLabsSpeech(finalText, finalVoice);

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
