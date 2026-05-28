"use client";

import { getActiveScenes } from "@/lib/adScenes";
import { getTemplateConfig } from "@/lib/adTemplates";
import type { AdScript, ProductInput } from "@/types/ad";

interface Props {
  script: AdScript;
  product: ProductInput;
  onRegenerate: () => void;
  regenerateLoading: boolean;
  onNext: () => void;
}

export default function Step2Script({
  script,
  product,
  onRegenerate,
  regenerateLoading,
  onNext,
}: Props) {
  const scenes = getActiveScenes(product, script);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="studio-section">
        <div className="studio-section-head">
          <div className="step-badge">✦</div>
          <div style={{ flex: 1 }}>
            <div className="step-title">{script.title}</div>
            <div className="step-sub">
              {getTemplateConfig(product.template).emoji}{" "}
              {getTemplateConfig(product.template).name} · {product.name} ·{" "}
              {scenes.length} scène{scenes.length > 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerateLoading}
            className="btn-sec"
            style={{ fontSize: 11 }}
          >
            {regenerateLoading ? "…" : "🔄 Régénérer"}
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(245, 182, 67, 0.08)",
            border: "1px solid rgba(245, 182, 67, 0.25)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-warm)", marginBottom: 6 }}>
            HOOK
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{script.hook}</div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text2)" }}>
          <strong>CTA :</strong> {script.cta}
        </div>
      </section>

      <section className="studio-section">
        <div className="step-title" style={{ marginBottom: 8 }}>
          Personnage cartoon
        </div>
        <div style={{ fontSize: 13 }}>
          <strong>{script.character.name}</strong> · {script.character.type}
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
            {script.character.description}
          </div>
        </div>
      </section>

      <section className="studio-section">
        <div className="step-title" style={{ marginBottom: 12 }}>
          Scènes ({scenes.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scenes.map((sc) => (
            <div
              key={sc.number}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--bg3)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#000",
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 99,
                  }}
                >
                  {sc.number}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{sc.title}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontWeight: 800,
                    color: "var(--accent-warm)",
                  }}
                >
                  {sc.subtitle}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 6 }}>
                {sc.narrative_role && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--accent-warm)",
                      textTransform: "uppercase",
                    }}
                  >
                    {sc.narrative_role}
                    {sc.duration_seconds ? ` · ${sc.duration_seconds}s` : ""}
                    {sc.voiceover_word_count != null
                      ? ` · ${sc.voiceover_word_count} mots`
                      : ""}
                  </span>
                )}
                {sc.visual_description}
              </div>
              <div style={{ fontSize: 11, fontStyle: "italic" }}>🎙 {sc.voiceover}</div>
            </div>
          ))}
        </div>
      </section>

      <button type="button" onClick={onNext} className="btn-primary" style={{ width: "100%" }}>
        Générer les visuels cartoon →
      </button>
    </div>
  );
}
