import { NextRequest, NextResponse } from "next/server";
import { generateIdeaSuggestion } from "@/lib/claude";
import type { VideoGenre } from "@/types/drama";

export async function POST(req: NextRequest) {
  try {
    const { genre } = (await req.json()) as { genre?: VideoGenre };
    const idea = await generateIdeaSuggestion(genre ?? "drama");
    return NextResponse.json({ idea });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
