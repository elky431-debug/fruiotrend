import { NextResponse } from "next/server";
import { VOICE_OPTIONS } from "@/lib/voices";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    voices: VOICE_OPTIONS,
    count: VOICE_OPTIONS.length,
    provider: "elevenlabs-fal",
  });
}
