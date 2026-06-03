"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

export type CreditsState = {
  credits: number | null;
  plan: string | null;
  hasPlan: boolean;
  loading: boolean;
  refresh: () => void;
};

/**
 * Crédits + plan de l'utilisateur, via /api/credits (qui gère le fallback dev).
 * Se rafraîchit sur l'événement "credits-updated" et toutes les `pollMs` ms.
 */
export function useCredits(pollMs = 30000): CreditsState {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/credits");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.credits === "number") setCredits(data.credits);
      setPlan(data.plan ?? null);
      setHasPlan(Boolean(data.hasPlan));
    } catch {
      // silencieux : le header affiche "…" en cas d'échec
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener("credits-updated", onUpdate);
    const id = pollMs ? window.setInterval(() => void load(), pollMs) : undefined;
    return () => {
      window.removeEventListener("credits-updated", onUpdate);
      if (id) window.clearInterval(id);
    };
  }, [load, pollMs]);

  return { credits, plan, hasPlan, loading, refresh: load };
}
