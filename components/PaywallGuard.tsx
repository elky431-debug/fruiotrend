"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { useCredits } from "@/hooks/useCredits";

/** Routes accessibles sans abonnement actif (sinon : boucle de redirection). */
const ALLOWED_PATHS = ["/plans"];

/**
 * Au retour de Stripe Checkout (success_url contient ?session_id=...), confirme
 * l'abonnement côté serveur avant de vérifier le plan.
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
    params.delete("session_id");
    params.delete("checkout");
    const clean =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", clean);
    window.dispatchEvent(new Event("credits-updated"));
  }
}

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

/**
 * Protège les pages applicatives : sans abonnement actif, redirige vers
 * /plans?paywall=true. Réutilise les crédits déjà chargés par CreditsProvider
 * pour éviter une requête réseau à chaque changement de page.
 */
export function PaywallGuard({ children }: { children: React.ReactNode }) {
  const { hasPlan, loading } = useCredits();
  const router = useRouter();
  const pathname = usePathname();
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      await confirmCheckoutIfNeeded();
      if (active) setCheckoutReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isAllowedPath(pathname) || hasPlan) {
      setRedirecting(false);
      return;
    }
    if (loading || !checkoutReady || redirecting) return;

    setRedirecting(true);
    router.replace("/plans?paywall=true");
  }, [loading, checkoutReady, hasPlan, pathname, redirecting, router]);

  const checking = loading || !checkoutReady;

  if (checking) {
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

  if (redirecting || (!isAllowedPath(pathname) && !hasPlan)) return null;

  return <>{children}</>;
}
