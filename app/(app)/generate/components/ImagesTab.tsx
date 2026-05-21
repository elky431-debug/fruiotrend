"use client";

import { useState } from "react";
import type { DramaScript } from "@/types/studio";
import type { CharacterPromptInput, ScenePromptInput } from "@/lib/prompts";

interface Props {
  script: DramaScript;
  images: Record<string, string>;
  onImageGenerated: (id: string, url: string) => void;
  onNext: () => void;
}

function ImageCard({
  label,
  sublabel,
  imageUrl,
  loading,
  error,
  aspectRatio,
  onRegen,
}: {
  label: string;
  sublabel: string;
  imageUrl?: string;
  loading?: boolean;
  error?: string;
  aspectRatio: string;
  onRegen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary">
      <div
        className="relative flex items-center justify-center bg-bg-card"
        style={{ aspectRatio }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-text-secondary" />
            <span className="text-[10px]">Génération...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-center">
            <div className="mb-2 line-clamp-4 text-[10px] text-red-400">{error}</div>
            <button
              type="button"
              onClick={onRegen}
              className="rounded-lg border border-border-light bg-bg-hover px-2 py-1 text-[10px] text-text-secondary hover:text-white"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <span className="text-2xl">🖼</span>
            <span className="text-[10px]">En attente</span>
          </div>
        )}
        {imageUrl && (
          <button
            type="button"
            onClick={onRegen}
            className="absolute right-2 top-2 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-white hover:bg-black/80"
          >
            ↺
          </button>
        )}
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-xs font-medium text-white">{label}</div>
        <div className="truncate text-[10px] text-text-secondary">{sublabel}</div>
      </div>
    </div>
  );
}

function characterSheetData(
  c: DramaScript["characters"][0]
): CharacterPromptInput {
  return {
    name: c.name,
    type: c.type,
    gender: c.gender,
    outfit: c.outfit,
    personality: c.personality,
    color: c.color,
  };
}

function sceneImageData(
  sc: DramaScript["scenes"][0],
  characters: DramaScript["characters"]
): ScenePromptInput {
  if (sc.scenePromptData) {
    return {
      setting: sc.scenePromptData.setting,
      emotion: sc.scenePromptData.emotion,
      action: sc.scenePromptData.action,
      narrative_beat: sc.scenePromptData.narrative_beat,
      characters: sc.scenePromptData.characters,
    };
  }

  return {
    setting: sc.setting,
    emotion: sc.emotion,
    action:
      sc.narrative_beat ||
      (sc.dialogues ?? []).map((d) => d.line).join(" | ") ||
      "",
    narrative_beat: sc.narrative_beat || "",
    characters: characters
      .filter((c) => sc.characters_in_scene?.includes(c.id))
      .map((c) => ({
        name: c.name,
        type: c.type,
        gender: c.gender,
        outfit: c.outfit,
      })),
  };
}

export default function ImagesTab({ script, images, onImageGenerated, onNext }: Props) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalLoading, setGlobalLoading] = useState(false);

  const genImage = async (
    id: string,
    type: "character_sheet" | "scene",
    data: CharacterPromptInput | ScenePromptInput
  ) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          characterData: type === "character_sheet" ? data : undefined,
          sceneData: type === "scene" ? data : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur génération");
      onImageGenerated(id, result.url);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : "Erreur",
      }));
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const generateAll = async () => {
    setGlobalLoading(true);
    const tasks: Array<{
      id: string;
      type: "character_sheet" | "scene";
      data: CharacterPromptInput | ScenePromptInput;
    }> = [
      ...script.characters.map((c) => ({
        id: `char_${c.id}`,
        type: "character_sheet" as const,
        data: characterSheetData(c),
      })),
      ...script.scenes.map((sc) => ({
        id: `scene_${sc.number}`,
        type: "scene" as const,
        data: sceneImageData(sc, script.characters),
      })),
    ];
    await Promise.all(tasks.map((t) => genImage(t.id, t.type, t.data)));
    setGlobalLoading(false);
  };

  const allDone =
    script.characters.every((c) => images[`char_${c.id}`]) &&
    script.scenes.every((sc) => images[`scene_${sc.number}`]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Génération d&apos;images</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Style photoréaliste · Gemini/Imagen → repli DALL-E si quota épuisé
          </p>
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400">
          Photo réaliste
        </span>
      </div>

      <div className="mb-5 flex gap-3">
        <button
          type="button"
          onClick={generateAll}
          disabled={globalLoading}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:opacity-40"
        >
          {globalLoading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Génération...
            </>
          ) : (
            <>🖼 Générer toutes les images</>
          )}
        </button>
        {allDone && (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-card px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bg-hover"
          >
            Animation →
          </button>
        )}
      </div>

      <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
        Character Sheets
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {script.characters.map((c) => {
          const id = `char_${c.id}`;
          return (
            <ImageCard
              key={id}
              label={c.name}
              sublabel={`${c.type} · ${c.outfit}`}
              imageUrl={images[id]}
              loading={loading[id]}
              error={errors[id]}
              aspectRatio="2/3"
              onRegen={() => genImage(id, "character_sheet", characterSheetData(c))}
            />
          );
        })}
      </div>

      <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
        Scènes
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {script.scenes.map((sc) => {
          const id = `scene_${sc.number}`;
          return (
            <ImageCard
              key={id}
              label={`Scène ${sc.number} — ${sc.title}`}
              sublabel={sc.emotion}
              imageUrl={images[id]}
              loading={loading[id]}
              error={errors[id]}
              aspectRatio="9/16"
              onRegen={() =>
                genImage(id, "scene", sceneImageData(sc, script.characters))
              }
            />
          );
        })}
      </div>
    </div>
  );
}
