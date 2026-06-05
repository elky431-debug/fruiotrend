"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { PLANS } from "@/lib/plans";
import { IconCheckCircle } from "@/components/icons";

type Settings = {
  displayName: string;
  email: string;
  language: string;
};

const DEFAULTS: Settings = {
  displayName: "",
  email: "",
  language: "fr",
};

const STORAGE_KEY = "pubmoi:settings";

export default function SettingsPage() {
  const { credits, plan } = useCredits();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const planConfig = plan ? PLANS[plan as keyof typeof PLANS] : null;
  const maxCredits = planConfig?.credits ?? 0;
  const creditPct =
    credits !== null && maxCredits > 0
      ? Math.min(100, Math.round((credits / maxCredits) * 100))
      : 0;

  return (
    <div className="app-page" style={{ paddingBottom: 80 }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 6,
            color: "var(--text)",
          }}
        >
          Paramètres
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 14 }}>
          Gère ton compte et ton abonnement
        </p>
      </div>

      <div
        style={{
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* ── Compte ── */}
        <Card title="Compte">
          <Field label="Nom affiché">
            <Input
              value={s.displayName}
              placeholder="Ton nom ou ta marque"
              onChange={(v) => set("displayName", v)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={s.email}
              placeholder="votre@email.com"
              onChange={(v) => set("email", v)}
            />
          </Field>
          <Field label="Langue">
            <Select
              value={s.language}
              onChange={(v) => set("language", v)}
              options={[
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
            />
          </Field>
          <button
            type="button"
            onClick={save}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              width: "100%",
              borderRadius: 12,
              border: "none",
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              color: "#fff",
              fontFamily: "inherit",
              background: saved
                ? "rgba(34,197,94,0.9)"
                : "linear-gradient(135deg, #ff6fae, #ff3d6e, #e32b45)",
              transition: "background 0.2s",
            }}
          >
            {saved ? (
              <>
                <IconCheckCircle size={16} /> Enregistré
              </>
            ) : (
              "Sauvegarder"
            )}
          </button>
        </Card>

        {/* ── Abonnement & crédits ── */}
        <Card title="Abonnement & crédits">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  background:
                    "linear-gradient(135deg, #ff6fae, #ff3d6e, #e32b45)",
                  color: "#fff",
                }}
              >
                {planConfig?.name ?? plan ?? "Aucun plan"}
              </span>
              {planConfig && (
                <span style={{ color: "var(--text2)", fontSize: 13 }}>
                  {planConfig.price}€/mois
                </span>
              )}
            </div>
            <Link
              href="/plans"
              className="btn-sec"
              style={{ fontSize: 13, textDecoration: "none" }}
            >
              Changer de plan
            </Link>
          </div>

          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--text2)" }}>Crédits restants</span>
              <span style={{ color: "var(--text)", fontWeight: 700 }}>
                {credits ?? "…"}
                {maxCredits > 0 && (
                  <span style={{ color: "var(--text3)" }}> / {maxCredits}</span>
                )}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "var(--bg3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${creditPct}%`,
                  background:
                    "linear-gradient(90deg, #ff6fae, #ff3d6e, #e32b45)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </Card>

        {/* ── Zone danger ── */}
        <section
          className="card"
          style={{ borderColor: "rgba(255,68,68,0.25)", padding: 22 }}
        >
          <h2 style={{ fontWeight: 700, color: "#ff6666", fontSize: 16 }}>
            Zone danger
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--text2)" }}>
            Supprimer définitivement ton compte et toutes tes pubs. Action
            irréversible.
          </p>
          <button
            type="button"
            style={{
              marginTop: 16,
              borderRadius: 12,
              border: "1px solid rgba(255,68,68,0.5)",
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#ff8585",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Supprimer mon compte
          </button>
        </section>
      </div>
    </div>
  );
}

/* ── Sous-composants ── */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: 22 }}>
      <h2 style={{ fontWeight: 700, color: "var(--text)", fontSize: 16 }}>
        {title}
      </h2>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: "var(--text2)",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const controlStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg2)",
  padding: "11px 14px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={controlStyle}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={controlStyle}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
