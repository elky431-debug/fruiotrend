"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PubMoiLogo } from "@/components/brand/PubMoiLogo";
import { useCredits } from "@/hooks/useCredits";

const NAV = [
  { href: "/dashboard", label: "Mes pubs" },
  { href: "/create", label: "+ Créer", accent: true },
  { href: "/plans", label: "Plans" },
];

const LOW_CREDITS_THRESHOLD = 6;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { credits } = useCredits();
  const lowCredits = credits !== null && credits < LOW_CREDITS_THRESHOLD;

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
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 60,
          }}
        >
          <PubMoiLogo href="/" size="md" priority />

          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV.map((item) => {
              const active = path.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 16px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      transition: "all 0.15s",
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
                      boxShadow: item.accent && active ? "0 4px 20px rgba(227, 43, 69, 0.35)" : "none",
                    }}
                  >
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/plans"
              title="Voir les plans et recharger"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                background: lowCredits
                  ? "rgba(232, 49, 58, 0.18)"
                  : "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 50%, #e32b45 100%)",
                border: lowCredits
                  ? "1px solid rgba(232, 49, 58, 0.6)"
                  : "1px solid rgba(255, 111, 174, 0.45)",
                borderRadius: 99,
                padding: "6px 14px",
                fontSize: 12,
                color: "#fff",
                fontWeight: 700,
                boxShadow: lowCredits
                  ? "none"
                  : "0 4px 16px rgba(255, 61, 110, 0.35)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 0 8px rgba(255,255,255,0.8)",
                }}
              />
              {credits !== null
                ? `${credits} crédit${credits > 1 ? "s" : ""}`
                : "…"}
              {lowCredits && (
                <span style={{ fontWeight: 600, opacity: 0.85 }}>
                  · Recharger
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              👤
            </Link>
          </div>
        </div>
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
