"use client";

import { useState } from "react";
import type { AdScript, ProductInput } from "@/types/ad";

interface Props {
  product: ProductInput;
  script: AdScript;
  images: Record<string, string>;
  onImageGenerated: (id: string, url: string) => void;
  onNext: () => void;
}

type GenStep = "idle" | "scenes" | "done";

export default function Step3Images({
  product,
  script,
  images,
  onImageGenerated,
  onNext,
}: Props) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [genStep, setGenStep] = useState<GenStep>("idle");
  const [globalLoading, setGlobal] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const productImageRefs = product.images.map((base64, index) => ({
    base64,
    mimeType: product.imagesMimeType?.[index] || "image/jpeg",
    url: `data:${product.imagesMimeType?.[index] || "image/jpeg"};base64,${base64}`,
  }));

  const genImage = async (
    sceneIndex: number,
    scene: AdScript["scenes"][number]
  ) => {
    const id = `scene_${scene.number}`;
    setLoading((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      console.log("[STEP3] Génération image scène", sceneIndex);
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          productDescription:
            script.productVisualDescription ||
            product.description ||
            product.name,
          productImages: productImageRefs,
          template: product.template,
          sceneIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error("[STEP3] Erreur scène", sceneIndex, ":", data.error);
        setErrors((prev) => ({
          ...prev,
          [id]: data.error || "Erreur inconnue",
        }));
        return;
      }

      console.log("[STEP3] ✅ Image scène", sceneIndex, "reçue");
      onImageGenerated(id, data.imageUrl || data.url);
    } catch (e) {
      console.error(
        "[STEP3] Erreur fetch scène",
        sceneIndex,
        ":",
        e instanceof Error ? e.message : "Erreur"
      );
      setErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : "Erreur",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const generateAllImages = async () => {
    setGlobal(true);
    setGenStep("scenes");
    for (let i = 0; i < script.scenes.length; i++) {
      setGeneratingIndex(i);
      await genImage(i, script.scenes[i]);
    }
    setGeneratingIndex(null);
    setGenStep("done");
    setGlobal(false);
  };

  const allDone = script.scenes.every((scene) => images[`scene_${scene.number}`]);

  const stepLabel: Record<GenStep, string> = {
    idle: "🖼 Générer tous les visuels",
    scenes: "⏳ Gemini génère les scènes...",
    done: "✓ Visuels prêts",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          type="button"
          onClick={generateAllImages}
          disabled={globalLoading}
          style={{
            padding: "11px 20px",
            borderRadius: 12,
            border: "none",
            background: globalLoading
              ? "var(--bg3)"
              : "linear-gradient(135deg,#FF6B35,#FF3D6B)",
            color: globalLoading ? "var(--text2)" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: globalLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {globalLoading ? (
            <>
              <Spin />
              {stepLabel[genStep]}
            </>
          ) : (
            stepLabel.idle
          )}
        </button>

        {allDone && (
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: "11px 20px",
              borderRadius: 12,
              border: "none",
              background: "var(--accent)",
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Générer les vidéos →
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {script.scenes.map((scene) => {
          const id = `scene_${scene.number}`;
          const imageUrl = images[id];
          const isLoading = loading[id];
          const error = errors[id];

          return (
            <div
              key={scene.number}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "9/16",
                  background: "var(--bg3)",
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: isLoading ? 0.4 : 1,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text3)",
                      fontSize: 24,
                    }}
                  >
                    {isLoading ? "…" : "9:16"}
                  </div>
                )}
              </div>

              <div style={{ padding: "10px 12px" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 4,
                  }}
                >
                  Scène {scene.number} — {scene.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text2)",
                    marginBottom: 8,
                  }}
                >
                  {scene.subtitle}
                </div>

                {error && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#F87171",
                      padding: 8,
                      textAlign: "center",
                      marginBottom: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    ❌ {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => genImage(scene.number - 1, scene)}
                  disabled={isLoading}
                  className="btn-sec"
                  style={{ width: "100%", fontSize: 11 }}
                >
                  {isLoading || generatingIndex === scene.number - 1
                    ? "…"
                    : imageUrl
                      ? "🔄 Régénérer"
                      : "Générer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spin() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.2)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
