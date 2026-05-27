"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Mes pubs" },
  { href: "/create", label: "+ Créer", accent: true },
  { href: "/plans", label: "Plans" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

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
          <Link
            href="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9 }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              📢
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", letterSpacing: "-0.03em" }}>
              Ad<span style={{ color: "var(--accent)" }}>Creative</span>
            </span>
          </Link>

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(245, 182, 67, 0.1)",
                border: "1px solid rgba(245, 182, 67, 0.25)",
                borderRadius: 99,
                padding: "6px 14px",
                fontSize: 12,
                color: "var(--accent-warm)",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent-warm)",
                  boxShadow: "0 0 8px var(--accent-warm)",
                }}
              />
              12 crédits
            </div>
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

      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
