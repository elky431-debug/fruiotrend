"use client";

import { GENRE_OPTIONS, type VideoGenre } from "@/types/drama";

interface Step1GenreProps {
  selected: VideoGenre | null;
  onSelect: (genre: VideoGenre) => void;
}

export function Step1Genre({ selected, onSelect }: Step1GenreProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-center text-2xl font-bold text-white">Quel type de video ?</h2>
      <p className="mt-2 text-center text-text-secondary">
        Choisis le genre de ton episode FruitDrama
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {GENRE_OPTIONS.map((genre) => {
          const isSelected = selected === genre.id;
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => onSelect(genre.id)}
              className={`card-base overflow-hidden text-left transition ${
                isSelected ? "border-2 border-accent ring-1 ring-accent" : "hover:border-border-light"
              }`}
            >
              <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-bg-hover to-bg-card text-6xl">
                {genre.icon}
                <span
                  className={`absolute right-3 top-3 h-5 w-5 rounded-full border-2 ${
                    isSelected
                      ? "border-accent bg-accent"
                      : "border-border-light bg-bg-card"
                  }`}
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-white">
                  {genre.icon} {genre.title}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{genre.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
