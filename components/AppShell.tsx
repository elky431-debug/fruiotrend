"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PubMoiLogo } from "@/components/brand/PubMoiLogo";
import { useCredits } from "@/hooks/useCredits";
import { getSupabaseBrowser } from "@/lib/supabase";
import { PLANS, type PlanId } from "@/lib/plans";
import {
  IconUser,
  IconMenu,
  IconX,
  IconLogout,
  IconBolt,
} from "@/components/icons";

const NAV: { href: string; label: string; accent?: boolean; badge?: string }[] =
  [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/create", label: "+ Créer", accent: true },
    { href: "/creatives", label: "Creatives Pro", badge: "NEW" },
    { href: "/plans", label: "Plans" },
  ];

const LOW_CREDITS_THRESHOLD = 6;

function formatCredits(n: number) {
  return n.toLocaleString("fr-FR");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { credits, plan, hasPlan } = useCredits();
  const lowCredits = credits !== null && credits < LOW_CREDITS_THRESHOLD;
  const planConfig = plan ? PLANS[plan as PlanId] : null;
  const planLabel = planConfig?.name ?? (hasPlan && plan ? plan : "Sans plan");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = getSupabaseBrowser();
      if (supabase) await supabase.auth.signOut();
    } catch {
      // On redirige quand même vers la page de connexion.
    } finally {
      setMenuOpen(false);
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  };

  // Ferme le menu mobile à chaque changement de page.
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  // Précharge les routes de navigation pour des clics instantanés.
  useEffect(() => {
    for (const item of NAV) router.prefetch(item.href);
  }, [router]);

  const creditsPill = (
    <Link
      href="/plans"
      title="Voir les plans et recharger"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        background: lowCredits
          ? "rgba(232, 49, 58, 0.1)"
          : "rgba(255, 255, 255, 0.04)",
        border: lowCredits
          ? "1px solid rgba(232, 49, 58, 0.45)"
          : "1px solid var(--border)",
        borderRadius: 14,
        padding: "5px 12px 5px 5px",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: lowCredits
            ? "rgba(232, 49, 58, 0.25)"
            : "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 50%, #e32b45 100%)",
          color: "#fff",
          boxShadow: lowCredits
            ? "none"
            : "0 4px 14px rgba(255, 61, 110, 0.3)",
        }}
      >
        <IconBolt size={14} />
      </div>
      <div style={{ lineHeight: 1.25, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {credits !== null ? formatCredits(credits) : "…"}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: lowCredits ? "#ff8fa3" : "var(--text2)",
          }}
        >
          {lowCredits ? "Recharger les crédits" : `${planLabel} · crédits`}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="app-shell">
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: "rgba(10, 8, 6, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(16px, 2.5vw, 40px)",
            height: 60,
            gap: 10,
          }}
        >
          <PubMoiLogo href="/" size="md" priority />

          {/* Navigation desktop */}
          <nav
            className="desktop-only"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {NAV.map((item) => {
              const active = path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 16px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      transition: "background 0.12s, color 0.12s, border-color 0.12s",
                      background: item.accent
                        ? active
                          ? "linear-gradient(135deg, var(--accent), var(--accent-cherry))"
                          : "rgba(227, 43, 69, 0.12)"
                        : active
                          ? "var(--bg3)"
                          : "transparent",
                      color: item.accent
                        ? active
                          ? "#fff"
                          : "var(--accent-soft)"
                        : active
                          ? "var(--text)"
                          : "var(--text2)",
                      border: item.accent
                        ? `1px solid ${active ? "transparent" : "rgba(227, 43, 69, 0.25)"}`
                        : "1px solid transparent",
                      boxShadow:
                        item.accent && active
                          ? "0 4px 20px rgba(227, 43, 69, 0.35)"
                          : "none",
                    }}
                  >
                    {item.label}
                    {item.badge && <NavBadge label={item.badge} />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Cluster droit desktop : crédits + profil */}
          <div
            className="desktop-only"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            {creditsPill}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="btn-sec"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                opacity: loggingOut ? 0.6 : 1,
              }}
            >
              <IconLogout size={15} />
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
            <Link
              href="/settings"
              title="Paramètres"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text2)",
                textDecoration: "none",
              }}
            >
              <IconUser size={17} />
            </Link>
          </div>

          {/* Cluster droit mobile : crédits + hamburger */}
          <div
            className="mobile-only"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            {creditsPill}
            <button
              type="button"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
              }}
            >
              {menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>

        {/* Menu déroulant mobile */}
        {menuOpen && (
          <div
            className="mobile-only"
            style={{
              borderTop: "1px solid var(--border)",
              background: "rgba(10, 8, 6, 0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "12px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {NAV.map((item) => {
              const active = path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      padding: "13px 16px",
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: "center",
                      background: item.accent
                        ? "linear-gradient(135deg, #ff6fae, #ff3d6e, #e32b45)"
                        : active
                          ? "var(--bg3)"
                          : "rgba(255,255,255,0.05)",
                      color: item.accent || active ? "#fff" : "var(--text2)",
                      border: `1px solid ${
                        active && !item.accent
                          ? "var(--border2)"
                          : "transparent"
                      }`,
                    }}
                  >
                    {item.label}
                    {item.badge && <NavBadge label={item.badge} />}
                  </div>
                </Link>
              );
            })}
            <Link href="/settings" style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 16px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text2)",
                }}
              >
                <IconUser size={17} /> Mon compte
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "13px 16px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                background: "rgba(227, 43, 69, 0.12)",
                color: "#ff8fa3",
                border: "1px solid rgba(227, 43, 69, 0.35)",
                cursor: loggingOut ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: loggingOut ? 0.6 : 1,
              }}
            >
              <IconLogout size={17} />
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        )}
      </header>

      <main
        style={{
          flex: 1,
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {children}
      </main>
    </div>
  );
}

function NavBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        marginLeft: 6,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.04em",
        lineHeight: 1,
        padding: "3px 5px",
        borderRadius: 5,
        color: "#fff",
        background: "linear-gradient(135deg, #ff6fae, #e32b45)",
        boxShadow: "0 2px 8px rgba(227, 43, 69, 0.4)",
      }}
    >
      {label}
    </span>
  );
}
