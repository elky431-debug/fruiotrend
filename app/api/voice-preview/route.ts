import { NextRequest, NextResponse } from "next/server";
import { generateGrokSpeech, normalizeGrokVoiceId } from "@/lib/grokTts";

export const maxDuration = 30;

const DEMO_TEXTS: Record<string, string> = {
  beaute: "Ta peau mérite mieux. Je la transforme en 30 jours.",
  sport: "Tes muscles me connaissent déjà. Je soulage tout.",
  tech: "La technologie qui change ton quotidien. C'est moi.",
  default: "Je suis là pour toi. Essaie-moi maintenant.",
};

export async function POST(req: NextRequest) {
  try {
    const { voiceName, category } = (await req.json()) as {
      voiceName?: string;
      category?: string;
    };

    if (!process.env.GROK_API_KEY) {
      return NextResponse.json(
        { error: "GROK_API_KEY manquante" },
        { status: 500 }
      );
    }

    const demoText = DEMO_TEXTS[category || ""] || DEMO_TEXTS.default;
    const voice = normalizeGrokVoiceId(voiceName);

    const result = await generateGrokSpeech(demoText, voice, {
      emotion: "excited",
      narrativeRole: "solution",
    });

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
