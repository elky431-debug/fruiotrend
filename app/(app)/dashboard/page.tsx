"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DramaScript } from "@/types/studio";

interface StoredGen {
  prompt: string;
  genre: string;
  script: DramaScript;
  duration: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [items, setItems] = useState<StoredGen[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("fruitdrama_last_gen");
    if (raw) {
      try {
        setItems([JSON.parse(raw)]);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <div className="app-page">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>
          Mes vidéos
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>Historique de tes générations</p>
      </div>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="text-6xl">🍓</span>
          <p className="mt-4 text-text-secondary">Aucune vidéo pour l&apos;instant</p>
          <Link href="/generate" className="btn-primary mt-6">
            Créer ma première vidéo
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((gen, i) => (
            <div key={i} className="card-base overflow-hidden">
              <div className="aspect-[9/16] bg-bg-hover flex items-center justify-center text-4xl">
                🎬
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white line-clamp-1">
                    {gen.script?.title ?? "Sans titre"}
                  </h3>
                  <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                    Générée
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary line-clamp-2">{gen.prompt}</p>
                <div className="mt-3 flex gap-4 text-xs text-text-muted">
                  <span>{gen.duration}s</span>
                  <span>{new Date(gen.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="btn-secondary flex-1 py-2 text-xs">
                    Télécharger
                  </button>
                  <button type="button" className="rounded-xl border border-border px-3 py-2 text-xs text-text-secondary hover:text-red-400">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
