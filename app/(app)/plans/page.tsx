"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLANS } from "@/lib/plans";
import { authFetch } from "@/lib/authFetch";
import { getSupabaseBrowser } from "@/lib/supabase";
import { IconCheck, IconArrowRight } from "@/components/icons";

export default function PlansPage() {
  return (
    <Suspense fallback={null}>
      <PlansContent />
    </Suspense>
  );
}

function PlansContent() {
  const params = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  const goToLogin = useCallback((planId: string) => {
    // Conserve le plan choisi pour reprendre le paiement après connexion.
    const back = `/plans?plan=${encodeURIComponent(planId)}`;
    window.location.href = `/login?redirect=${encodeURIComponent(back)}`;
  }, []);

  const handleSubscribe = useCallback(
    async (planId: string) => {
      setLoading(planId);
      try {
        // Vérifie la session avant tout : sans connexion, on envoie d'abord
        // l'utilisateur vers /login (sinon l'API renvoie « Non connecté »).
        const supabase = getSupabaseBrowser();
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            goToLogin(planId);
            return;
          }
        }

        const res = await authFetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });

        if (res.status === 401) {
          goToLogin(planId);
          return;
        }

        const data = await res.json();
        if (!res.ok || data.error) {
          alert(data.error || "Erreur lors du paiement");
          return;
        }
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        alert("Impossible de contacter le paiement. Réessaie.");
      } finally {
        setLoading(null);
      }
    },
    [goToLogin]
  );

  // Reprise auto : si on revient de la connexion avec ?plan=…, relance le paiement.
  useEffect(() => {
    const plan = params.get("plan");
    if (!plan || autoTriggered.current || !PLANS[plan as keyof typeof PLANS]) {
      return;
    }
    autoTriggered.current = true;
    void handleSubscribe(plan);
  }, [params, handleSubscribe]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 20px" }}>
      <h1
        style={{
          textAlign: "center",
          color: "#fff",
          fontSize: 40,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        Choisissez votre plan
      </h1>
      <p
        style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 16,
        }}
      >
        1 pub complète (1 scène) = 6 crédits · Script + images inclus dans le
        coût
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          marginTop: 40,
        }}
      >
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            style={{
              background: plan.popular
                ? "rgba(232,49,58,0.08)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${
                plan.popular ? "#E8313A" : "rgba(255,255,255,0.08)"
              }`,
              borderRadius: 20,
              padding: 28,
              position: "relative",
            }}
          >
            {"popular" in plan && plan.popular && (
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#E8313A",
                  color: "#fff",
                  padding: "4px 20px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                LE PLUS POPULAIRE
              </div>
            )}

            <h2
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {plan.name}
            </h2>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#fff", fontSize: 40, fontWeight: 800 }}>
                {plan.price}€
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                /mois
              </span>
            </div>
            <div
              style={{
                color: "#E8313A",
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 20,
                padding: "6px 12px",
                background: "rgba(232,49,58,0.1)",
                borderRadius: 8,
                display: "inline-block",
              }}
            >
              {plan.credits} crédits · {plan.description}
            </div>

            <ul style={{ listStyle: "none", padding: 0, marginBottom: 28 }}>
              {plan.features.map((f) => (
                <li
                  key={f}
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    marginBottom: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#E8313A",
                      flexShrink: 0,
                      display: "inline-flex",
                      marginTop: 2,
                    }}
                  >
                    <IconCheck size={15} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "14px 0",
                background: plan.popular ? "#E8313A" : "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading === plan.id ? 0.7 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading === plan.id ? (
                "Redirection..."
              ) : (
                <>
                  Commencer avec {plan.name} <IconArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <p
        style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 13,
          marginTop: 32,
        }}
      >
        Paiement sécurisé par Stripe · Résiliation à tout moment · Crédits
        remis à zéro chaque mois
      </p>
    </div>
  );
}
