import { NextResponse } from "next/server";
import { VOICE_OPTIONS } from "@/lib/voices";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    voices: VOICE_OPTIONS,
    count: VOICE_OPTIONS.length,
    provider: "grok-tts-aurora",
    note: "Voix Grok xAI — aperçu via /api/voice-preview. LTX utilise le style vocal dans le prompt vidéo.",
  });
}
