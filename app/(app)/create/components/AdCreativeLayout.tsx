"use client";

import { Fragment, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { normalizeAdScript, resolveSceneCount } from "@/lib/adScenes";
import type { AdScript, ProductInput } from "@/types/ad";
import Step1Product from "./Step1Product";
import AppProductStep from "./AppProductStep";
import Step2Script from "./Step2Script";
import Step3Images from "./Step3Images";
import Step4Video from "./Step4Video";

type ProductMode = "product" | "app";

const TABS = [
  { num: 1 as const, label: "Produit", api: "" },
  { num: 2 as const, label: "Script", api: "IA PubMoi" },
  { num: 3 as const, label: "Visuels", api: "IA PubMoi" },
  { num: 4 as const, label: "Vidéo", api: "PubMoi Video" },
];

export default function CreatorLayout() {
  const [tab, setTab] = useState<1 | 2 | 3 | 4>(1);
  const [product, setProduct] = useState<ProductInput | null>(null);
  const [script, setScript] = useState<AdScript | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [productMode, setProductMode] = useState<ProductMode>("product");

  const goTab = (n: 1 | 2 | 3 | 4) => {
    if (n === 2 && !product) return;
    if (n === 3 && !script) return;
    if (n === 4 && Object.keys(images).length === 0) return;
    setTab(n);
  };

  const generateScript = async (input: ProductInput) => {
    setScriptLoading(true);
    setScriptError("");
    setSaved(false);

    try {
      const res = await authFetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: input }),
      });
      const data = await res.json();
      if (res.status === 402) {
        window.dispatchEvent(new Event("credits-updated"));
        throw new Error(
          data.error ||
            `Crédits insuffisants (${data.required} requis, ${data.remaining} restants)`
        );
      }
      if (!res.ok) throw new Error(data.error || "Erreur script");
      window.dispatchEvent(new Event("credits-updated"));

      const normalized = normalizeAdScript(data as AdScript, input.nScenes);
      if (!normalized.scenes?.length) {
        throw new Error(
          "Le script est vide. Réessayez ou changez le nombre de scènes."
        );
      }

      setProduct(input);
      setScript(normalized);
      setImages({});
      setVideos({});
      setTab(2);
    } catch (e) {
      setProduct(input);
      setScriptError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setScriptLoading(false);
    }
  };

  /** Passe directement à l'éditeur de script manuel, sans appeler l'IA. */
  const startCustomScript = (input: ProductInput) => {
    const count = resolveSceneCount(input);
    const blankScenes = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Scène ${i + 1}`,
      narrative_role: "solution" as const,
      background: "",
      visual_description: "",
      character_action: "",
      voiceover: "",
      voiceover_word_count: 0,
      duration_seconds: Math.round((input.duration || 15) / count),
      mouth_expression: "open mouth speaking",
      emotion: "excited",
      subtitle: `SCÈNE ${i + 1}`,
      hook: "",
      gemini_prompt: "",
      grok_video_prompt:
        "Cinematic Pixar 3D product advertisement, smooth camera movement, 9:16 vertical",
    }));

    const blankScript: AdScript = {
      title: input.name,
      hook: "",
      cta: "",
      duration: `${input.duration || 15}s`,
      productVisualDescription: "",
      nScenes: count,
      scenes: blankScenes,
      character: {
        name: input.name,
        type: "produit",
        description: input.description,
        outfit: "",
        personality: "",
        gemini_character_prompt: "",
      },
    };

    setScriptError("");
    setProduct(input);
    setScript(normalizeAdScript(blankScript, count));
    setImages({});
    setVideos({});
    setCustomMode(true);
    setTab(2);
  };

  return (
    <div className="create-shell">
      <div className="create-head">
        <span className="create-eyebrow">
          <span className="dot" />
          STUDIO IA
        </span>
        <h1 className="create-title">Crée ta pub</h1>
        <p className="create-subtitle">
          De l&apos;upload à la vidéo finale — script, visuels et voix générés
          par IA.
        </p>
      </div>

      <div className="stepper" role="tablist" aria-label="Étapes de création">
        {TABS.map((t, i) => {
          const active = tab === t.num;
          const done = t.num < tab;
          const locked =
            (t.num === 2 && !product) ||
            (t.num === 3 && !script) ||
            (t.num === 4 && Object.keys(images).length === 0);

          return (
            <Fragment key={t.num}>
              {i > 0 && (
                <span
                  className={`stepper-line${t.num <= tab ? " filled" : ""}`}
                  aria-hidden
                />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goTab(t.num)}
                disabled={locked}
                className={`stepper-node${active ? " is-active" : ""}${
                  done ? " is-done" : ""
                }`}
              >
                <span className="stepper-node-circle">
                  {done && !active ? "✓" : t.num}
                </span>
                <span className="stepper-node-label">{t.label}</span>
                {active && t.api ? (
                  <span className="stepper-node-api">{t.api}</span>
                ) : null}
              </button>
            </Fragment>
          );
        })}
      </div>

      {saved && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#86efac",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Pub sauvegardée dans Mes pubs.
        </div>
      )}

      {scriptError && tab === 1 && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(227, 43, 69, 0.12)",
            border: "1px solid rgba(227, 43, 69, 0.35)",
            color: "#ff8fa3",
            fontSize: 12,
          }}
        >
          {scriptError}
        </div>
      )}

      {tab === 1 && (
        <>
          <div
            className="seg-toggle"
            role="tablist"
            aria-label="Type de pub"
          >
            <span
              className={`seg-toggle-thumb${
                productMode === "app" ? " right" : ""
              }`}
              aria-hidden
            />
            {(
              [
                { id: "product", label: "Produit", icon: "🛍" },
                { id: "app", label: "Appli / Site", icon: "📱" },
              ] as const
            ).map((m) => {
              const active = productMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setProductMode(m.id)}
                  className={`seg-btn${active ? " is-active" : ""}`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {productMode === "product" ? (
            <Step1Product
              onNext={generateScript}
              onWriteOwnScript={startCustomScript}
              loading={scriptLoading}
              initial={product}
            />
          ) : (
            <AppProductStep
              onNext={generateScript}
              loading={scriptLoading}
              initial={product}
            />
          )}
        </>
      )}

      {tab === 2 && script && product && (
        <Step2Script
          script={script}
          product={product}
          startInCustomMode={customMode}
          onRegenerate={() => generateScript(product)}
          regenerateLoading={scriptLoading}
          onNext={() => setTab(3)}
          onCustomScript={(custom) => {
            setScript(normalizeAdScript(custom, custom.nScenes));
            setImages({});
            setVideos({});
          }}
        />
      )}

      {tab === 3 && product && script && (
        <Step3Images
          product={product}
          script={script}
          images={images}
          onImageGenerated={(id, url) =>
            setImages((prev) => ({ ...prev, [id]: url }))
          }
          onNext={() => setTab(4)}
        />
      )}

      {tab === 4 && product && script && (
        <Step4Video
          product={product}
          script={script}
          images={images}
          videos={videos}
          onVideoGenerated={(id, url) =>
            setVideos((prev) => ({ ...prev, [id]: url }))
          }
          onSaved={() => setSaved(true)}
        />
      )}
    </div>
  );
}
