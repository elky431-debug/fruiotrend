import { NextRequest, NextResponse } from "next/server";
import {
  buildCharacterSheetPrompt,
  buildScenePrompt,
  type CharacterPromptInput,
  type ScenePromptInput,
} from "@/lib/prompts";
import { generateImage } from "@/lib/images";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      characterData,
      sceneData,
      prompt: legacyPrompt,
    } = body as {
      type?: "character_sheet" | "scene";
      characterData?: CharacterPromptInput;
      sceneData?: ScenePromptInput;
      prompt?: string;
    };

    let prompt: string;

    if (type === "character_sheet" && characterData) {
      prompt = buildCharacterSheetPrompt(characterData);
    } else if (type === "scene" && sceneData) {
      prompt = buildScenePrompt(sceneData);
    } else if (legacyPrompt?.trim()) {
      prompt = legacyPrompt.trim();
    } else {
      return NextResponse.json(
        { error: "Paramètres manquants (characterData ou sceneData)" },
        { status: 400 }
      );
    }

    const imageType = type === "character_sheet" ? "character_sheet" : "scene";
    const result = await generateImage(prompt, imageType);

    return NextResponse.json({
      mimeType: result.mimeType,
      data: result.data,
      url: result.url,
      provider: result.provider,
    });
  } catch (err) {
    console.error("images:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Génération échouée (Gemini + DALL-E)",
      },
      { status: 500 }
    );
  }
}
