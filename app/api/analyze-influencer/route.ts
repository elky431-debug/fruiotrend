import { NextRequest, NextResponse } from "next/server";
import {
  analyzeInfluencerPhoto,
  type InfluencerTraits,
} from "@/lib/influencerAnalysis";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { influencerImage } = (await req.json()) as {
      influencerImage?: { base64?: string; mimeType?: string };
    };

    const traits: InfluencerTraits | null =
      await analyzeInfluencerPhoto(influencerImage);

    if (!traits) {
      return NextResponse.json(
        { error: "Impossible d'analyser la photo influenceur." },
        { status: 422 }
      );
    }

    return NextResponse.json({ influencerTraits: traits });
  } catch (error) {
    console.error("[ANALYZE-INFLUENCER]", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse de la photo." },
      { status: 500 }
    );
  }
}
