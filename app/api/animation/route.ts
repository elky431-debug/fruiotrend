import { NextRequest, NextResponse } from "next/server";
import { generateGrokAnimation } from "@/lib/grok";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64, imageMimeType } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    const result = await generateGrokAnimation({
      prompt: prompt.trim(),
      imageBase64,
      imageMimeType,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("animation:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur animation" },
      { status: 500 }
    );
  }
}
