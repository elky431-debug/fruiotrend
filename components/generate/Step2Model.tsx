"use client";

import { MODEL_OPTIONS, isModelLocked, type UserPlan, type VideoModel } from "@/types/drama";

interface Step2ModelProps {
  selected: VideoModel;
  plan: UserPlan;
  onSelect: (model: VideoModel) => void;
}

export function Step2Model({ selected, plan, onSelect }: Step2ModelProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="text-center text-2xl font-bold text-white">Choisis ton style visuel</h2>
      <p className="mt-2 text-center text-text-secondary">
        Le modele qui generera les images de tes scenes
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {MODEL_OPTIONS.map((model) => {
          const locked = isModelLocked(model.id, plan);
          const isSelected = selected === model.id;
          return (
            <button
              key={model.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(model.id)}
              className={`card-base overflow-hidden text-left transition ${
                isSelected ? "border-2 border-accent ring-1 ring-accent" : ""
              } ${locked ? "cursor-not-allowed opacity-40" : "hover:border-border-light"}`}
            >
              <div className="relative flex h-40 items-center justify-center bg-bg-hover text-5xl">
                🍌
                {model.minPlan === "pro" && (
                  <span className="absolute left-3 top-3 rounded bg-accent px-2 py-0.5 text-[10px] font-bold text-black">
                    Pro
                  </span>
                )}
                <span
                  className={`absolute right-3 top-3 h-5 w-5 rounded-full border-2 ${
                    isSelected ? "border-accent bg-accent" : "border-border-light bg-bg-card"
                  }`}
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-white">{model.name}</p>
                <p className="text-sm text-text-secondary">{model.badge}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
