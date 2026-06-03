"use client";

import { useState } from "react";
import { getActiveScenes, resolveSceneCount } from "@/lib/adScenes";
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
  startInCustomMode?: boolean;
}

export default function Step2Script({
  script,
  product,
  onRegenerate,
  regenerateLoading,
  onNext,
  onCustomScript,
  startInCustomMode = false,
}: Props) {
  const scenes = getActiveScenes(product, script);
  const character = scriptCharacter(script, product);
  const sceneCount = resolveSceneCount(product, script);
  const hasGenerated = Boolean(script.hook?.trim());

  const [useCustomScript, setUseCustomScript] = useState(startInCustomMode);
  const [customScenes, setCustomScenes] = useState<string[]>(() =>
    Array.from({ length: sceneCount }, (_, i) => scenes[i]?.voiceover ?? "")
  );
  const [savedCustom, setSavedCustom] = useState(false);

  const setSceneText = (index: number, value: string) =>
    setCustomScenes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const wordCountOf = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const totalWords = customScenes.reduce((s, t) => s + wordCountOf(t), 0);
  const canApply = customScenes.some((t) => t.trim());

  const applyCustomScript = () => {
    if (!canApply) return;
    const duration = product.duration || 15;
    const perScene = Math.max(1, Math.round(duration / sceneCount));
    const filled = customScenes.map((t) => t.trim());

    const customScript: AdScript = {
      title: product.name,
      hook: filled[0] || "",
      cta: "",
      duration: `${duration}s`,
      productVisualDescription: script.productVisualDescription ?? "",
      nScenes: sceneCount,
      scenes: filled.map((text, i) => ({
        number: i + 1,
        title: `Scène ${i + 1}`,
        narrative_role: "solution",
        background: "",
        visual_description: "",
        character_action: "",
        voiceover: text,
        voiceover_word_count: wordCountOf(text),
        duration_seconds: perScene,
        mouth_expression: "open mouth speaking",
        emotion: "excited",
        subtitle: `SCÈNE ${i + 1}`,
        hook: text,
        gemini_prompt: "",
        grok_video_prompt:
          "Cinematic Pixar 3D product advertisement, smooth camera movement, 9:16 vertical",
      })),
      character: script.character,
    };
    onCustomScript(customScript);
    setSavedCustom(true);
    window.setTimeout(() => setSavedCustom(false), 2000);
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
              {sceneCount > 1 ? ` — ${sceneCount} scènes` : ""}
            </p>
          </div>
        </div>

        {useCustomScript && (
          <div style={{ marginTop: 16 }}>
            {customScenes.map((text, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label
                  style={{
                    color: "var(--text2)",
                    fontSize: 12,
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  {sceneCount > 1
                    ? `VOICEOVER — Scène ${i + 1}`
                    : "VOICEOVER — ce que dit le produit"}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setSceneText(i, e.target.value)}
                  placeholder={
                    i === 0
                      ? `Ex: "Si tu fais du padel et t'as mal aux pieds, tu dois m'acheter. Je vais soulager tes douleurs et éviter les blessures."`
                      : `Texte de la scène ${i + 1}…`
                  }
                  style={{
                    width: "100%",
                    minHeight: 90,
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
                <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 6 }}>
                  {wordCountOf(text)} mots · ~{Math.round(wordCountOf(text) / 2.3)}s
                </p>
              </div>
            ))}
            <p style={{ color: "var(--text3)", fontSize: 11, marginBottom: 10 }}>
              Total : {totalWords} mots · ~{Math.round(totalWords / 2.3)}s
            </p>
            <button
              type="button"
              onClick={applyCustomScript}
              disabled={!canApply}
              className="btn-primary"
              style={{
                opacity: canApply ? 1 : 0.5,
              }}
            >
              {savedCustom ? "✓ Script appliqué" : "Utiliser ce script →"}
            </button>
          </div>
        )}
      </section>

      {hasGenerated && (
      <>
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
      </>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!hasGenerated}
        className="btn-primary"
        style={{ width: "100%", opacity: hasGenerated ? 1 : 0.5 }}
      >
        {hasGenerated
          ? "Générer les visuels cartoon →"
          : "Écris et applique ton script d'abord"}
      </button>
    </div>
  );
}
