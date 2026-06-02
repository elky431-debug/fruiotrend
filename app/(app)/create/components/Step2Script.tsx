"use client";

import { useState } from "react";
import { getActiveScenes } from "@/lib/adScenes";
import { getTemplateConfig } from "@/lib/adTemplates";
import type { AdScript, ProductInput } from "@/types/ad";

function scriptCharacter(script: AdScript, product: ProductInput) {
  return (
    script.character ?? {
      name: product.name,
      type: "produit",
      description: script.hook || product.description,
      outfit: "",
      personality: "",
      gemini_character_prompt: "",
    }
  );
}

interface Props {
  script: AdScript;
  product: ProductInput;
  onRegenerate: () => void;
  regenerateLoading: boolean;
  onNext: () => void;
  onCustomScript: (script: AdScript) => void;
}

export default function Step2Script({
  script,
  product,
  onRegenerate,
  regenerateLoading,
  onNext,
  onCustomScript,
}: Props) {
  const scenes = getActiveScenes(product, script);
  const character = scriptCharacter(script, product);
  const [useCustomScript, setUseCustomScript] = useState(false);
  const [customVoiceover, setCustomVoiceover] = useState("");

  const wordCount = customVoiceover.split(/\s+/).filter(Boolean).length;

  const applyCustomScript = () => {
    const text = customVoiceover.trim();
    if (!text) return;
    const duration = product.duration || 15;
    const customScript: AdScript = {
      title: product.name,
      hook: text,
      cta: "",
      duration: `${duration}s`,
      productVisualDescription: script.productVisualDescription ?? "",
      nScenes: 1,
      scenes: [
        {
          number: 1,
          title: "Scène personnalisée",
          narrative_role: "solution",
          background: "",
          visual_description: "",
          character_action: "",
          voiceover: text,
          voiceover_word_count: wordCount,
          duration_seconds: duration,
          mouth_expression: "open mouth speaking",
          emotion: "excited",
          subtitle: "",
          hook: text,
          gemini_prompt: "",
          grok_video_prompt:
            "Cinematic Pixar 3D product advertisement, smooth camera movement, 9:16 vertical",
        },
      ],
      character: script.character,
    };
    onCustomScript(customScript);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="studio-section">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setUseCustomScript((v) => !v)}
        >
          <div
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: useCustomScript
                ? "var(--accent)"
                : "rgba(255,255,255,0.1)",
              position: "relative",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                left: useCustomScript ? 20 : 2,
                transition: "all 0.2s",
              }}
            />
          </div>
          <div>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
              ✍️ Écrire mon propre script
            </p>
            <p style={{ color: "var(--text2)", fontSize: 12 }}>
              Tu choisis exactement ce que dit le produit
            </p>
          </div>
        </div>

        {useCustomScript && (
          <div style={{ marginTop: 16 }}>
            <label
              style={{
                color: "var(--text2)",
                fontSize: 12,
                marginBottom: 8,
                display: "block",
              }}
            >
              VOICEOVER — ce que dit le produit
            </label>
            <textarea
              value={customVoiceover}
              onChange={(e) => setCustomVoiceover(e.target.value)}
              placeholder={`Ex: "Si tu fais du padel et t'as mal aux pieds, tu dois m'acheter. Je vais soulager tes douleurs et éviter les blessures."`}
              style={{
                width: "100%",
                minHeight: 100,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 14,
                padding: 12,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
            />
            <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 8 }}>
              {wordCount} mots · ~{Math.round(wordCount / 2.3)}s
            </p>
            <button
              type="button"
              onClick={applyCustomScript}
              disabled={!customVoiceover.trim()}
              className="btn-primary"
              style={{
                marginTop: 12,
                opacity: customVoiceover.trim() ? 1 : 0.5,
              }}
            >
              Utiliser ce script →
            </button>
          </div>
        )}
      </section>

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
            background: "rgba(255, 92, 157, 0.08)",
            border: "1px solid rgba(255, 92, 157, 0.25)",
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
          <strong>{character.name}</strong> · {character.type}
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
            {character.description}
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
