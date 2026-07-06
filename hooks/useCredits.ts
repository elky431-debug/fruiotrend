"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authFetch } from "@/lib/authFetch";

export type CreditsState = {
  credits: number | null;
  plan: string | null;
  hasPlan: boolean;
  loading: boolean;
  refresh: () => void;
};

const CreditsContext = createContext<CreditsState | null>(null);

function useCreditsInternal(pollMs = 30000): CreditsState {
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    void (async () => {
      try {
        await authFetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // Le webhook reste le filet de sécurité.
      } finally {
        params.delete("session_id");
        params.delete("checkout");
        const clean =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "");
        window.history.replaceState({}, "", clean);
        window.dispatchEvent(new Event("credits-updated"));
      }
    })();
  }, []);

  return { credits, plan, hasPlan, loading, refresh: load };
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const value = useCreditsInternal();
  return createElement(CreditsContext.Provider, { value }, children);
}

/**
 * Crédits + plan de l'utilisateur, via /api/credits (qui gère le fallback dev).
 * Une seule requête partagée dans l'app grâce à CreditsProvider.
 */
export function useCredits(): CreditsState {
  const ctx = useContext(CreditsContext);
  if (ctx) return ctx;
  return useCreditsInternal();
}
