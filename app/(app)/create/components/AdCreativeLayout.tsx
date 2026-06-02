"use client";

import { useState } from "react";
import { normalizeAdScript } from "@/lib/adScenes";
import type { AdScript, ProductInput } from "@/types/ad";
import Step1Product from "./Step1Product";
import Step2Script from "./Step2Script";
import Step3Images from "./Step3Images";
import Step4Video from "./Step4Video";

const TABS = [
  { num: 1 as const, label: "Produit", api: "" },
  { num: 2 as const, label: "Script", api: "GPT-4o" },
  { num: 3 as const, label: "Visuels", api: "Gemini" },
  { num: 4 as const, label: "Vidéo", api: "LTX (vidéo + voix)" },
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
      const res = await fetch("/api/script", {
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

  return (
    <div>
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "var(--text)",
            marginBottom: 6,
          }}
        >
          Nouvelle pub
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 13 }}>
          Upload · Script IA · Visuels · Vidéo
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          background: "var(--bg1)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 5,
          marginBottom: 32,
          gap: 4,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.num;
          const done = t.num < tab;
          const locked =
            (t.num === 2 && !product) ||
            (t.num === 3 && !script) ||
            (t.num === 4 && Object.keys(images).length === 0);

          return (
            <button
              key={t.num}
              type="button"
              onClick={() => goTab(t.num)}
              disabled={locked}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "11px 8px",
                borderRadius: 14,
                border: "none",
                cursor: locked ? "not-allowed" : "pointer",
                background: active ? "var(--bg3)" : "transparent",
                outline: active ? "1px solid var(--border2)" : "none",
                opacity: locked ? 0.3 : 1,
                transition: "all 0.18s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  background: active
                    ? "var(--accent)"
                    : done
                      ? "#22c55e"
                      : "var(--bg4)",
                  color: active || done ? "#000" : "var(--text3)",
                }}
              >
                {done && !active ? "✓" : t.num}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? "var(--text)" : "var(--text2)",
                }}
              >
                {t.label}
              </span>
              {active && t.api && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 99,
                    background: "var(--bg4)",
                    color: "var(--text2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {t.api}
                </span>
              )}
            </button>
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
        <Step1Product
          onNext={generateScript}
          loading={scriptLoading}
          initial={product}
        />
      )}

      {tab === 2 && script && product && (
        <Step2Script
          script={script}
          product={product}
          onRegenerate={() => generateScript(product)}
          regenerateLoading={scriptLoading}
          onNext={() => setTab(3)}
          onCustomScript={(custom) => {
            setScript(normalizeAdScript(custom, 1));
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
