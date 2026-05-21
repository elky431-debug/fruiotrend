"use client";

import { useState } from "react";
import type { DramaScript } from "@/types/studio";

interface Props {
  script: DramaScript;
  images: Record<string, string>;
  videos: Record<number, string>;
  onVideoGenerated: (sceneNum: number, url: string) => void;
}

function PromptCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-bg-card p-2 pr-12 text-[9px] leading-relaxed text-text-muted">
      {text.slice(0, 150)}...
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={`absolute right-1.5 top-1.5 rounded border px-1.5 py-0.5 text-[9px] transition-all ${
          copied
            ? "border-green-500/40 text-green-400"
            : "border-border-light text-text-muted hover:text-white"
        }`}
      >
        {copied ? "✓" : "Copier"}
      </button>
    </div>
  );
}

export default function AnimationTab({
  script,
  images,
  videos,
  onVideoGenerated,
}: Props) {
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [globalLoading, setGlobalLoading] = useState(false);

  const animateScene = async (sceneNum: number) => {
    const scene = script.scenes.find((s) => s.number === sceneNum);
    if (!scene) return;

    setLoading((prev) => ({ ...prev, [sceneNum]: true }));
    setErrors((prev) => ({ ...prev, [sceneNum]: "" }));

    const imageUrl = images[`scene_${sceneNum}`];
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (imageUrl?.startsWith("data:")) {
      const [meta, data] = imageUrl.split(",");
      imageMimeType = meta.match(/:(.*?);/)?.[1];
      imageBase64 = data;
    }

    try {
      const res = await fetch("/api/animation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.grok_video_prompt,
          imageBase64,
          imageMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur Grok");

      if (data.videoUrl) {
        onVideoGenerated(sceneNum, data.videoUrl);
      } else {
        setTexts((prev) => ({ ...prev, [sceneNum]: data.text || "" }));
      }
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [sceneNum]: e instanceof Error ? e.message : "Erreur",
      }));
    }
    setLoading((prev) => ({ ...prev, [sceneNum]: false }));
  };

  const animateAll = async () => {
    setGlobalLoading(true);
    await Promise.all(script.scenes.map((sc) => animateScene(sc.number)));
    setGlobalLoading(false);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Animation vidéo</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Grok anime chaque scène — format 9:16
          </p>
        </div>
        <span className="rounded-full border border-border-light bg-bg-card px-2 py-1 text-[10px] font-semibold text-white">
          Grok xAI
        </span>
      </div>

      <button
        type="button"
        onClick={animateAll}
        disabled={globalLoading}
        className="mb-5 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:opacity-40"
      >
        {globalLoading ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            Grok anime...
          </>
        ) : (
          <>🎬 Animer toutes les scènes</>
        )}
      </button>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {script.scenes.map((sc) => {
          const previewImg = images[`scene_${sc.number}`];
          const videoUrl = videos[sc.number];
          const isLoading = loading[sc.number];
          const err = errors[sc.number];
          const promptText = texts[sc.number];

          return (
            <div
              key={sc.number}
              className="overflow-hidden rounded-xl border border-border bg-bg-secondary"
            >
              <div
                className="relative flex items-center justify-center bg-bg-card"
                style={{ aspectRatio: "9/16" }}
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    {previewImg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImg}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-30"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-text-secondary" />
                      <span className="text-[10px] text-text-secondary">Grok génère...</span>
                    </div>
                  </div>
                ) : err ? (
                  <div className="p-3">
                    <div className="mb-2 text-[10px] text-red-400">{err}</div>
                    <div className="mb-2 text-[9px] font-medium uppercase tracking-wide text-text-secondary">
                      Prompt à copier dans Grok :
                    </div>
                    <PromptCopy text={sc.grok_video_prompt} />
                  </div>
                ) : promptText ? (
                  <div className="p-3">
                    <div className="mb-1 text-[10px] font-medium text-text-secondary">
                      Réponse Grok :
                    </div>
                    <div className="mb-2 line-clamp-3 text-[10px] text-text-muted">
                      {promptText.slice(0, 200)}
                    </div>
                    <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-text-secondary">
                      Ou copie ce prompt :
                    </div>
                    <PromptCopy text={sc.grok_video_prompt} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {previewImg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImg}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => animateScene(sc.number)}
                      className="relative z-10 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-accent-hover"
                    >
                      ▶ Animer
                    </button>
                  </div>
                )}
              </div>
              <div className="px-3 py-2">
                <div className="truncate text-xs font-medium text-white">
                  Scène {sc.number} — {sc.title}
                </div>
                <div className="text-[10px] text-text-secondary">
                  {sc.emotion} · <span className="text-accent">{sc.subtitle}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
