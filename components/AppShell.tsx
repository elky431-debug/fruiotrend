"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Mes vidéos", icon: "▦" },
  { href: "/generate", label: "Créer", icon: "+", accent: true },
  { href: "/credits", label: "Plans", icon: "◈" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#050505",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(5,5,5,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
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
            height: 56,
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "#C8FF00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              🍓
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              FruitDrama
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
                      padding: "6px 14px",
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "all 0.12s",
                      background: item.accent
                        ? active
                          ? "#C8FF00"
                          : "rgba(200,255,0,0.08)"
                        : active
                          ? "rgba(255,255,255,0.06)"
                          : "transparent",
                      color: item.accent
                        ? active
                          ? "#000"
                          : "#C8FF00"
                        : active
                          ? "#fff"
                          : "#666",
                      border: item.accent
                        ? `1px solid ${active ? "transparent" : "rgba(200,255,0,0.2)"}`
                        : "1px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
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
                background: "rgba(200,255,0,0.06)",
                border: "1px solid rgba(200,255,0,0.15)",
                borderRadius: 100,
                padding: "5px 12px",
                fontSize: 12,
                color: "#C8FF00",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#C8FF00",
                  display: "inline-block",
                }}
              />
              12 crédits
            </div>
            <Link
              href="/settings"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
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
