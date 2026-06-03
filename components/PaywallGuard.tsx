"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";

/** Routes accessibles sans abonnement actif (sinon : boucle de redirection). */
const ALLOWED_PATHS = ["/plans"];

/**
 * Au retour de Stripe Checkout (success_url contient ?session_id=...), confirme
 * l'abonnement côté serveur avant de vérifier le plan. Sans ça, le garde
 * redirigerait vers /plans avant que les crédits ne soient octroyés.
 */
async function confirmCheckoutIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (!sessionId) return;

  try {
    await authFetch("/api/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Le webhook reste le filet de sécurité.
  } finally {
    // Nettoie l'URL pour ne pas reconfirmer à chaque navigation.
    params.delete("session_id");
    params.delete("checkout");
    const clean =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", clean);
    window.dispatchEvent(new Event("credits-updated"));
  }
}

type GuardStatus = "loading" | "ok" | "redirect";

/**
 * Protège les pages applicatives : sans abonnement actif, redirige vers
 * /plans?paywall=true. Sans session (401), redirige vers /login.
 *
 * L'état réel vient de /api/credits, qui gère le fallback dev (CREDITS_DEV_*),
 * donc l'app reste utilisable en local tant qu'aucune auth réelle n'existe.
 * En cas d'erreur serveur/réseau transitoire, on laisse passer (fail-open).
 */
export function PaywallGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GuardStatus>("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAllowed = ALLOWED_PATHS.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    );
    if (isAllowed) {
      setStatus("ok");
      return;
    }

    let active = true;

    (async () => {
      try {
        await confirmCheckoutIfNeeded();
        const res = await authFetch("/api/credits");

        if (res.status === 401 || res.status === 403) {
          if (!active) return;
          setStatus("redirect");
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        if (!res.ok) {
          // Erreur serveur transitoire → ne pas bloquer l'utilisateur.
          if (active) setStatus("ok");
          return;
        }

        const data = await res.json();
        if (!active) return;

        if (data?.hasPlan) {
          setStatus("ok");
        } else {
          setStatus("redirect");
          router.replace("/plans?paywall=true");
        }
      } catch {
        // Échec réseau → fail-open pour ne pas verrouiller en cas de pépin.
        if (active) setStatus("ok");
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(232,49,58,0.3)",
              borderTopColor: "#E8313A",
              borderRadius: "50%",
              animation: "paywall-spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Vérification…</p>
        </div>
        <style>{`@keyframes paywall-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === "redirect") return null;

  return <>{children}</>;
}
