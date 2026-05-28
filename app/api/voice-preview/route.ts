import { NextRequest, NextResponse } from "next/server";
import {
  applyEmotionTags,
  generateElevenLabsSpeech,
  normalizeElevenVoiceId,
} from "@/lib/elevenlabsVoice";
import { DEMO_TEXT } from "@/lib/voices";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { voiceName, category } = (await req.json()) as {
      voiceName?: string;
      category?: string;
    };

    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "FAL_API_KEY manquante" },
        { status: 500 }
      );
    }

    const voice = normalizeElevenVoiceId(voiceName);
    const demoText = applyEmotionTags(
      DEMO_TEXT[category || ""] || DEMO_TEXT.default,
      "excited",
      "solution"
    );

    const result = await generateElevenLabsSpeech(demoText, voice);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[VOICE-PREVIEW]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur aperçu voix",
      },
      { status: 500 }
    );
  }
}
