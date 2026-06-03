import { NextRequest, NextResponse } from "next/server";
import {
  generateSpeechWithFallback,
  resolveTtsVoiceIds,
} from "@/lib/generateSpeech";

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

    if (!process.env.GROK_API_KEY && !process.env.FAL_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Aperçu voix PubMoi indisponible pour le moment. Réessaie plus tard.",
        },
        { status: 500 }
      );
    }

    const demoText = DEMO_TEXTS[category || ""] || DEMO_TEXTS.default;
    const { uiId } = resolveTtsVoiceIds(voiceName);
    console.log("[VOICE-PREVIEW] Voix:", voiceName, "→", uiId);

    const result = await generateSpeechWithFallback(demoText, voiceName || uiId, {
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
