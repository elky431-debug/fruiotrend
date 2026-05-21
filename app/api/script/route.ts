import { NextRequest, NextResponse } from "next/server";
import { generateStudioScript } from "@/lib/openai";
import type { CharacterDef } from "@/types/character";
import type { DramaScript, ScenePromptData } from "@/types/studio";

function buildScenePromptData(
  scene: DramaScript["scenes"][0],
  allCharacters: DramaScript["characters"]
): ScenePromptData {
  const charsInScene = (scene.characters_in_scene ?? []).map((charId) => {
    const char = allCharacters.find(
      (c) => c.id === charId || c.name === charId
    );
    if (!char) return null;
    return {
      name: char.name,
      type: char.type,
      gender: char.gender,
      outfit: char.outfit,
    };
  });

  return {
    setting: scene.setting,
    emotion: scene.emotion,
    action:
      scene.narrative_beat ||
      (scene.dialogues ?? []).map((d) => d.line).join(" / ") ||
      "",
    narrative_beat: scene.narrative_beat || "",
    characters: charsInScene.filter(Boolean) as ScenePromptData["characters"],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, univers, genre, nScenes, duration, characters } =
      await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    const chars = (characters ?? []) as CharacterDef[];
    if (chars.length < 2) {
      return NextResponse.json(
        { error: "Ajoute au moins 2 personnages" },
        { status: 400 }
      );
    }

    const incomplete = chars.find((c) => !c.name?.trim() || !c.type?.trim());
    if (incomplete) {
      return NextResponse.json(
        { error: "Complète le nom et le type de chaque personnage" },
        { status: 400 }
      );
    }

    const script = await generateStudioScript({
      prompt: prompt.trim(),
      univers: univers ?? "Fruits",
      genre: genre ?? "Drama",
      nScenes: Math.min(6, Math.max(3, Number(nScenes) || 4)),
      duration: duration ?? "30s",
      characters: chars,
    });

    if (!script.title || !script.logline) {
      return NextResponse.json(
        { error: "Script incomplet retourné par GPT-4o. Réessaie." },
        { status: 422 }
      );
    }

    const enrichedCharacters = script.characters.map((c) => {
      const userChar = chars.find(
        (uc) => uc.id === c.id || uc.name === c.name
      );
      return userChar ? { ...c, ...userChar } : c;
    });

    const enrichedScenes = script.scenes.map((scene) => ({
      ...scene,
      scenePromptData: buildScenePromptData(
        { ...scene, characters_in_scene: scene.characters_in_scene },
        enrichedCharacters
      ),
    }));

    return NextResponse.json({
      ...script,
      characters: enrichedCharacters,
      scenes: enrichedScenes,
    });
  } catch (err) {
    console.error("script:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération script" },
      { status: 500 }
    );
  }
}
