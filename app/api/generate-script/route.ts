import { NextRequest, NextResponse } from "next/server";
import { generateDramaScript } from "@/lib/claude";
import type { VideoGenre } from "@/types/drama";

const BLOCKED = /\b(nsfw|porn|gore)\b/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, genre, duration } = body as {
      prompt?: string;
      genre?: VideoGenre;
      duration?: number;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }
    if (BLOCKED.test(prompt)) {
      return NextResponse.json({ error: "Contenu non autorisé" }, { status: 400 });
    }

    const script = await generateDramaScript(
      prompt.trim(),
      genre ?? "drama",
      duration ?? 30
    );

    return NextResponse.json({ script });
  } catch (err) {
    console.error("generate-script:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération script" },
      { status: 500 }
    );
  }
}
