"use client";

import {
  DURATION_OPTIONS,
  isDurationLocked,
  type UserPlan,
  type VideoGenre,
} from "@/types/drama";

interface Step4PromptProps {
  prompt: string;
  duration: number;
  genre: VideoGenre;
  plan: UserPlan;
  loadingIdea: boolean;
  onPromptChange: (v: string) => void;
  onDurationChange: (s: number) => void;
  onSuggestIdea: () => void;
}

export function Step4Prompt({
  prompt,
  duration,
  genre,
  plan,
  loadingIdea,
  onPromptChange,
  onDurationChange,
  onSuggestIdea,
}: Step4PromptProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="text-2xl font-bold text-white">Decris ta video</h2>
      <p className="mt-2 text-text-secondary">
        Sois creatif ! Plus ton prompt est detaille, meilleur sera le resultat.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={5}
        placeholder="Decris ton histoire... Ex: Une mangue decouvre que son mari la trompe avec sa meilleure amie"
        className="mt-6 w-full rounded-xl border border-border bg-bg-secondary p-4 text-white placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <button
        type="button"
        onClick={onSuggestIdea}
        disabled={loadingIdea}
        className="mt-3 w-full rounded-xl border border-border bg-bg-card py-3 text-sm text-text-secondary transition hover:text-white disabled:opacity-50"
      >
        {loadingIdea ? "Génération…" : "✨ Propose-moi une idée"}
      </button>

      <div className="mt-8">
        <p className="text-xs font-bold tracking-widest text-text-secondary">DURÉE</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => {
            const locked = isDurationLocked(opt.seconds, plan);
            const isSelected = duration === opt.seconds;
            return (
              <button
                key={opt.seconds}
                type="button"
                disabled={locked}
                onClick={() => onDurationChange(opt.seconds)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  isSelected
                    ? "bg-accent font-semibold text-black"
                    : locked
                      ? "cursor-not-allowed border border-border bg-bg-card text-white/30"
                      : "border border-border bg-bg-card text-white hover:border-border-light"
                }`}
              >
                {opt.seconds}s {locked && "🔒"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
