"use client";

import { useState } from "react";
import type { DramaScript } from "@/types/studio";

function PromptBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-bg-card p-3 pr-16 text-[11px] leading-relaxed text-text-secondary">
      {text}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={`absolute right-2 top-2 rounded-md border px-2 py-1 text-[10px] transition ${
          copied
            ? "border-green-500/40 bg-green-500/10 text-green-400"
            : "border-border-light bg-bg-hover text-text-secondary hover:text-white"
        }`}
      >
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}

export default function ScriptDisplay({ script }: { script: DramaScript }) {
  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="mb-1 text-xl font-bold text-white">{script.title}</div>
      <div className="text-sm italic text-text-secondary">{script.logline}</div>
      {script.tension_arc && (
        <div className="mt-2 text-xs text-accent/80">{script.tension_arc}</div>
      )}

      <div className="mb-3 mt-5 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
        Personnages
      </div>
      {script.characters.map((c) => (
        <div key={c.id} className="mb-3 rounded-xl border border-border bg-bg-secondary p-4">
          <div className="mb-2 font-semibold text-white">
            {c.name}{" "}
            <span className="text-xs font-normal text-text-secondary">
              · {c.type} · {c.role ?? c.personality}
            </span>
          </div>
          <PromptBox text={c.gemini_character_sheet} />
        </div>
      ))}

      <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
        Scènes
      </div>
      {script.scenes.map((sc) => (
        <div
          key={sc.number}
          className="mb-3 overflow-hidden rounded-xl border border-border bg-bg-secondary"
        >
          <div className="flex items-center gap-3 border-b border-border bg-bg-card px-4 py-3">
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-black">
              Scène {sc.number}
            </span>
            <span className="text-sm font-medium text-white">{sc.title}</span>
            <span className="ml-auto rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-secondary">
              {sc.emotion}
            </span>
          </div>
          <div className="px-4 py-3">
            {sc.narrative_beat && (
              <p className="mb-2 text-xs text-text-muted">{sc.narrative_beat}</p>
            )}
            <div className="mb-2 text-xs text-text-secondary">📍 {sc.setting}</div>
            {sc.dialogues.map((d, i) => (
              <div key={i} className="mb-1.5 text-xs">
                <span className="font-semibold text-accent">{d.speaker}:</span>{" "}
                <span className="italic text-text-secondary">&ldquo;{d.line}&rdquo;</span>
                {d.subtext && (
                  <span className="ml-1 text-[10px] text-text-muted">
                    ({d.subtext})
                  </span>
                )}
              </div>
            ))}
            <div className="mt-2 inline-block rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-wide text-accent">
              {sc.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
