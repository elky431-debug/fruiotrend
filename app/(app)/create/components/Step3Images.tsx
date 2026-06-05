"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { getActiveScenes } from "@/lib/adScenes";
import {
  downloadAllWithDelay,
  downloadDataUrlAsFile,
  sceneImageFilename,
} from "@/lib/downloadAsset";
import type { AdScript, ProductInput } from "@/types/ad";
import { IconDownload, IconArrowRight, IconEdit } from "@/components/icons";

interface Props {
  product: ProductInput;
  script: AdScript;
  images: Record<string, string>;
  onImageGenerated: (id: string, url: string) => void;
  onNext: () => void;
}

type GenStep = "idle" | "analyzing" | "scenes" | "done";

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
  const inflightRef = useRef<Set<string>>(new Set());
  const productAnalysisRef = useRef<string | null>(null);

  const scenes = useMemo(
    () => getActiveScenes(product, script),
    [product, script]
  );

  const sceneId = (index: number) => `scene_${index + 1}`;

  useEffect(() => {
    productAnalysisRef.current = null;
  }, [product.images, product.packagingImage, product.description, script.productVisualDescription]);

  const productImageRefs = product.images.map((base64, index) => ({
    base64,
    mimeType: product.imagesMimeType?.[index] || "image/jpeg",
    url: `data:${product.imagesMimeType?.[index] || "image/jpeg"};base64,${base64}`,
  }));

  const fetchProductAnalysis = async (): Promise<string> => {
    if (productAnalysisRef.current) {
      return productAnalysisRef.current;
    }

    const fallback =
      script.productVisualDescription ||
      product.description ||
      product.name;

    if (productImageRefs.length === 0) {
      productAnalysisRef.current = fallback;
      return fallback;
    }

    console.log("[STEP3] Analyse du produit (GPT-4o Vision)...");
    try {
      const res = await authFetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productImages: productImageRefs,
          productDescription: fallback,
        }),
      });

      const data = await res.json();
      const analysis = String(data.productAnalysis || fallback).trim();
      productAnalysisRef.current = analysis;
      console.log("[STEP3] Analyse reçue:", analysis);
      return analysis;
    } catch (err) {
      console.warn("[STEP3] Analyse échouée, fallback sur description", err);
      productAnalysisRef.current = fallback;
      return fallback;
    }
  };

  const genImage = async (
    sceneIndex: number,
    scene: AdScript["scenes"][number],
    productAnalysis: string
  ) => {
    const id = sceneId(sceneIndex);

    if (inflightRef.current.has(id)) {
      console.log("[STEP3] Déjà en cours pour", id);
      return;
    }
    inflightRef.current.add(id);

    setLoading((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      console.log(
        `[STEP3] 1 seul appel API — scène ${sceneIndex + 1}/${scenes.length}`
      );
      console.log("[STEP3] Template envoyé:", product.template);
      const res = await authFetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          sceneIndex,
          totalScenes: scenes.length,
          productDescription:
            script.productVisualDescription ||
            product.description ||
            product.name,
          productName: product.name,
          productAnalysis,
          productImages: productImageRefs,
          packagingImage: product.packagingImage || null,
          influencerImage:
            product.influencerMode === "photo"
              ? product.influencerImage || null
              : null,
          influencerTraits:
            product.influencerMode === "photo"
              ? product.influencerTraits || null
              : null,
          influencerMode: product.influencerMode || "ai",
          influencerBackgroundMode: product.influencerBackgroundMode || "change",
          template: product.template,
          targetAudience: product.targetAudience,
          productType: product.productType || "product",
          storyTheme: product.storyTheme,
          storyMode: product.storyMode,
          theme: product.storyTheme,
          wojakCharacterId: product.wojakCharacterId,
          wojak_profile: product.wojakCharacterId,
          regenerate: Boolean(images[id]),
        }),
      });

      const data = await res.json();
      if (res.status === 402) {
        setErrors((prev) => ({
          ...prev,
          [id]:
            data.error ||
            `Crédits insuffisants (${data.required} requis, ${data.remaining} restants)`,
        }));
        window.dispatchEvent(new Event("credits-updated"));
        return;
      }
      if (!res.ok || data.error) {
        setErrors((prev) => ({
          ...prev,
          [id]: data.error || "Erreur inconnue",
        }));
        return;
      }

      onImageGenerated(id, data.imageUrl || data.url);
      window.dispatchEvent(new Event("credits-updated"));
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : "Erreur",
      }));
    } finally {
      inflightRef.current.delete(id);
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const generateAllImages = async () => {
    if (globalLoading) return;
    if (scenes.length === 0) {
      setErrors((prev) => ({
        ...prev,
        _global:
          "Aucune scène dans le script — retournez à l'étape Script et régénérez.",
      }));
      return;
    }

    setGlobal(true);
    setGenStep("analyzing");

    try {
      const productAnalysis = await fetchProductAnalysis();
      setGenStep("scenes");
      console.log("[STEP3] Génération de", scenes.length, "image(s) max");

      for (let i = 0; i < scenes.length; i++) {
        setGeneratingIndex(i);
        await genImage(i, scenes[i], productAnalysis);
      }

      setGenStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setErrors((prev) => ({ ...prev, _global: msg }));
    } finally {
      setGeneratingIndex(null);
      setGlobal(false);
    }
  };

  const generateSingleImage = async (
    sceneIndex: number,
    scene: AdScript["scenes"][number]
  ) => {
    try {
      const productAnalysis = await fetchProductAnalysis();
      await genImage(sceneIndex, scene, productAnalysis);
    } catch (e) {
      const id = sceneId(sceneIndex);
      setErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : "Erreur",
      }));
    }
  };

  const allDone = scenes.every((_, i) => images[sceneId(i)]);
  const hasAnyImage = scenes.some((_, i) => images[sceneId(i)]);

  const downloadSceneImage = (sceneIndex: number) => {
    const url = images[sceneId(sceneIndex)];
    if (!url) return;
    downloadDataUrlAsFile(
      url,
      sceneImageFilename(product.name, sceneIndex, url)
    );
  };

  const downloadAllImages = async () => {
    const items = scenes
      .map((_, i) => {
        const url = images[sceneId(i)];
        if (!url) return null;
        return {
          dataUrl: url,
          filename: sceneImageFilename(product.name, i, url),
        };
      })
      .filter((x): x is { dataUrl: string; filename: string } => x !== null);

    if (items.length === 0) return;
    await downloadAllWithDelay(items);
  };

  const stepLabel: Record<GenStep, string> = {
    idle:
      scenes.length === 1
        ? "Générer l'image"
        : `Générer les ${scenes.length} visuels`,
    analyzing: "Analyse du produit…",
    scenes:
      scenes.length === 1
        ? "PubMoi génère l'image…"
        : "PubMoi génère les scènes…",
    done: "Visuels prêts",
  };

  return (
    <div>
      <p
        style={{
          fontSize: 12,
          color: "var(--text2)",
          marginBottom: 16,
        }}
      >
        {scenes.length} scène{scenes.length > 1 ? "s" : ""} ·{" "}
        {scenes.length === 1
          ? "1 image sera générée"
          : `${scenes.length} images seront générées`}
      </p>

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

        {hasAnyImage && (
          <button
            type="button"
            onClick={() => void downloadAllImages()}
            disabled={globalLoading}
            className="btn-sec"
            style={{
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconDownload size={15} /> Télécharger tout
          </button>
        )}

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
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Générer les vidéos <IconArrowRight size={15} />
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
        {scenes.map((scene, i) => {
          const id = sceneId(i);
          const imageUrl = images[id];
          const isLoading = loading[id];
          const error = errors[id];
          const busy = isLoading || generatingIndex === i;

          return (
            <div
              key={id}
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
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: busy ? 0.4 : 1,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => downloadSceneImage(i)}
                      disabled={busy}
                      title="Télécharger l'image"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(10, 8, 6, 0.75)",
                        backdropFilter: "blur(8px)",
                        color: "#fff8f2",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: busy ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconDownload size={14} />
                    </button>
                  </>
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
                    {busy ? "…" : "9:16"}
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
                  Scène {i + 1} — {scene.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text2)",
                    marginBottom: 8,
                  }}
                >
                  {product.storyTheme === "wojak"
                    ? scene.voiceover
                    : scene.subtitle}
                </div>

                {error && (
                  <div
                    title={error}
                    style={{
                      fontSize: 11,
                      color: "#F87171",
                      padding: 8,
                      textAlign: "center",
                      marginBottom: 6,
                      lineHeight: 1.35,
                      maxHeight: 72,
                      overflow: "hidden",
                    }}
                  >
                    {error.length > 140 ? `${error.slice(0, 140)}…` : error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => generateSingleImage(i, scene)}
                    disabled={busy || globalLoading}
                    className="btn-sec"
                    style={{
                      flex: 1,
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    {busy ? (
                      "…"
                    ) : imageUrl ? (
                      <>
                        <IconEdit size={13} /> Régénérer
                      </>
                    ) : (
                      "Générer"
                    )}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => downloadSceneImage(i)}
                      disabled={busy}
                      className="btn-sec"
                      style={{ fontSize: 11, flexShrink: 0 }}
                    >
                      Télécharger
                    </button>
                  )}
                </div>
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
