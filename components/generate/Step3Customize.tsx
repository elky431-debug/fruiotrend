"use client";

import { useState } from "react";
import {
  MUSIC_TRACKS,
  SUBTITLE_OPTIONS,
  type SubtitleStyle,
} from "@/types/drama";

interface Step3CustomizeProps {
  subtitles: SubtitleStyle;
  music: string | null;
  onSubtitlesChange: (s: SubtitleStyle) => void;
  onMusicChange: (id: string | null) => void;
}

export function Step3Customize({
  subtitles,
  music,
  onSubtitlesChange,
  onMusicChange,
}: Step3CustomizeProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="text-center text-2xl font-bold text-white">Personnalise ta video</h2>
      <p className="mt-2 text-center text-text-secondary">
        Ajoute des sous-titres et une musique de fond (optionnel)
      </p>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-medium text-white">Sous-titres</span>
          <span className="rounded-full bg-bg-card px-2 py-0.5 text-xs text-text-secondary">
            Optionnel
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBTITLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                onSubtitlesChange(subtitles === opt.id ? null : opt.id)
              }
              className={`card-base flex h-32 flex-col items-center justify-center ${
                subtitles === opt.id ? "border-2 border-accent ring-1 ring-accent" : ""
              }`}
            >
              <span className={`text-lg text-white ${opt.style}`}>{opt.preview}</span>
              <span className="mt-2 text-sm text-text-secondary">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-medium text-white">Musique de fond</span>
          <span className="rounded-full bg-bg-card px-2 py-0.5 text-xs text-text-secondary">
            Optionnel
          </span>
        </div>

        <div className="mb-4 flex gap-2">
          {(["library", "upload"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? "bg-accent text-black" : "bg-bg-card text-text-secondary"
              }`}
            >
              {t === "library" ? "Bibliothèque" : "Upload"}
            </button>
          ))}
        </div>

        {tab === "library" ? (
          <div className="card-base divide-y divide-border overflow-hidden">
            {MUSIC_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => onMusicChange(music === track.id ? null : track.id)}
                className={`flex w-full items-center gap-4 p-4 text-left transition hover:bg-bg-hover ${
                  music === track.id ? "border-l-2 border-accent bg-[#1F2A1F]" : ""
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-border text-sm">
                  ▶
                </span>
                <div>
                  <p className="font-medium text-white">🎵 {track.name}</p>
                  <p className="text-sm text-text-secondary">{track.duration}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card-base p-8 text-center text-text-secondary">
            Glissez un fichier MP3 ici (bientôt disponible)
          </div>
        )}
      </div>
    </div>
  );
}
