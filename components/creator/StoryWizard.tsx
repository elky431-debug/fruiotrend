"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import {
  storyDataToProductInput,
  storyResponseToAdScript,
  type StoryScriptResponse,
} from "@/lib/storyAd";
import { FRUIT_CHARACTERS, STORY_THEMES, type StoryThemeId } from "@/lib/storyThemes";
import type { AdScript, ProductInput } from "@/types/ad";
import Step3Images from "@/app/(app)/create/components/Step3Images";
import Step4Video from "@/app/(app)/create/components/Step4Video";
import ScreenshotUploader, {
  type ScreenshotAsset,
} from "@/components/creator/ScreenshotUploader";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  padding: "10px 14px",
  marginBottom: 12,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px 0",
  background: "linear-gradient(90deg, #E8313A, #ff6b35)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

const backBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.5)",
  cursor: "pointer",
  marginBottom: 24,
  fontSize: 14,
};

export default function StoryWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [storyData, setStoryData] = useState({
    productName: "",
    productDescription: "",
    productType: "product" as "product" | "app",
    productImages: [] as ScreenshotAsset[],
    appScreenshots: [] as ScreenshotAsset[],
    appUrl: "",
    theme: "" as StoryThemeId | "",
    wojak_profile: "wojak_classic",
    fruit1: "",
    fruit2: "",
    storyIdea: "",
  });
  const [product, setProduct] = useState<ProductInput | null>(null);
  const [script, setScript] = useState<AdScript | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateStory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: storyData.theme,
          fruit1: storyData.fruit1,
          fruit2: storyData.fruit2,
          wojak_profile: storyData.wojak_profile,
          storyIdea: storyData.storyIdea,
          productName: storyData.productName,
          productDescription: storyData.productDescription,
          productType: storyData.productType,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        window.dispatchEvent(new Event("credits-updated"));
        throw new Error(data.error || "Crédits insuffisants");
      }
      if (!res.ok) throw new Error(data.error || "Erreur histoire");

      window.dispatchEvent(new Event("credits-updated"));

      const input = storyDataToProductInput({
        ...storyData,
        theme: storyData.theme as StoryThemeId,
      });
      const adScript = storyResponseToAdScript(
        data as StoryScriptResponse,
        input
      );

      setProduct(input);
      setScript(adScript);
      setImages({});
      setVideos({});
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <button type="button" onClick={onBack} style={backBtn}>
          ← Retour
        </button>
        <h2
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          🎬 History Ads — Ton produit
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { id: "product" as const, label: "📦 Produit physique" },
            { id: "app" as const, label: "📱 Appli / Site" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setStoryData((p) => ({ ...p, productType: t.id }))
              }
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background:
                  storyData.productType === t.id
                    ? "#E8313A"
                    : "rgba(255,255,255,0.07)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {storyData.productType === "product" && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              PHOTOS DU PRODUIT
            </label>
            <ScreenshotUploader
              screenshots={storyData.productImages}
              onChange={(imgs) =>
                setStoryData((p) => ({ ...p, productImages: imgs }))
              }
              maxFiles={3}
            />
          </div>
        )}

        {storyData.productType === "app" && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              URL DE L&apos;APPLI / SITE
            </label>
            <input
              value={storyData.appUrl}
              onChange={(e) =>
                setStoryData((p) => ({ ...p, appUrl: e.target.value }))
              }
              placeholder="https://monappli.fr"
              style={inputStyle}
            />
            <label
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              SCREENSHOTS DE L&apos;INTERFACE (optionnel)
            </label>
            <ScreenshotUploader
              screenshots={storyData.appScreenshots}
              onChange={(imgs) =>
                setStoryData((p) => ({ ...p, appScreenshots: imgs }))
              }
              maxFiles={3}
            />
          </div>
        )}

        <input
          value={storyData.productName}
          onChange={(e) =>
            setStoryData((p) => ({ ...p, productName: e.target.value }))
          }
          placeholder={
            storyData.productType === "product"
              ? "Nom du produit"
              : "Nom de l'appli / site"
          }
          style={inputStyle}
        />

        <textarea
          value={storyData.productDescription}
          onChange={(e) =>
            setStoryData((p) => ({
              ...p,
              productDescription: e.target.value,
            }))
          }
          placeholder={
            storyData.productType === "product"
              ? "Ce que fait le produit et son bénéfice principal"
              : "Ce que fait l'appli et son bénéfice principal"
          }
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
            marginBottom: 20,
          }}
        />

        {error && (
          <p style={{ color: "#ff8fa3", fontSize: 12, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={
            !storyData.productName.trim() ||
            !storyData.productDescription.trim()
          }
          style={{
            ...primaryBtn,
            opacity:
              !storyData.productName.trim() ||
              !storyData.productDescription.trim()
                ? 0.5
                : 1,
          }}
        >
          Choisir le thème →
        </button>
      </div>
    );
  }

  if (step === 2) {
    const themeReady =
      storyData.theme === "wojak"
        ? true
        : storyData.theme === "fruit-drama"
          ? Boolean(storyData.fruit1 && storyData.fruit2)
          : false;

    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <button type="button" onClick={() => setStep(1)} style={backBtn}>
          ← Retour
        </button>
        <h2
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          🎬 Choisis ton univers
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {Object.values(STORY_THEMES).map((theme) => (
            <div
              key={theme.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                setStoryData((p) => ({
                  ...p,
                  theme: theme.id as StoryThemeId,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStoryData((p) => ({
                    ...p,
                    theme: theme.id as StoryThemeId,
                  }));
                }
              }}
              style={{
                background:
                  storyData.theme === theme.id
                    ? "rgba(232,49,58,0.1)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  storyData.theme === theme.id
                    ? "#E8313A"
                    : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{theme.emoji}</div>
              <p
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 6px",
                }}
              >
                {theme.name}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  margin: 0,
                }}
              >
                {theme.description}
              </p>
            </div>
          ))}
        </div>

        {storyData.theme === "fruit-drama" && (
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              CHOISIS TES 2 PERSONNAGES
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {(["fruit1", "fruit2"] as const).map((key, idx) => (
                <div key={key}>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 11,
                      marginBottom: 8,
                    }}
                  >
                    {idx === 0
                      ? "PERSONNAGE PRINCIPAL"
                      : "PERSONNAGE SECONDAIRE"}
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    {FRUIT_CHARACTERS.filter(
                      (f) => key === "fruit1" || f.id !== storyData.fruit1
                    ).map((fruit) => (
                      <button
                        key={fruit.id}
                        type="button"
                        onClick={() =>
                          setStoryData((p) => ({ ...p, [key]: fruit.id }))
                        }
                        style={{
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: `1px solid ${
                            storyData[key] === fruit.id
                              ? "#E8313A"
                              : "rgba(255,255,255,0.06)"
                          }`,
                          background:
                            storyData[key] === fruit.id
                              ? "rgba(232,49,58,0.15)"
                              : "rgba(255,255,255,0.03)",
                          color: "#fff",
                          fontSize: 12,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {fruit.emoji} <strong>{fruit.name}</strong>{" "}
                        <span
                          style={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: 10,
                          }}
                        >
                          — {fruit.personality}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {storyData.theme && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              💡 TON IDÉE D&apos;HISTOIRE (optionnel)
            </label>
            <textarea
              value={storyData.storyIdea}
              onChange={(e) =>
                setStoryData((p) => ({ ...p, storyIdea: e.target.value }))
              }
              placeholder={
                storyData.theme === "wojak"
                  ? "Ex: Il rate sa présentation puis découvre le produit..."
                  : "Ex: La banane est licenciée puis trouve une solution..."
              }
              rows={2}
              style={{
                ...inputStyle,
                marginTop: 6,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}

        {error && (
          <p style={{ color: "#ff8fa3", fontSize: 12, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void generateStory()}
          disabled={!themeReady || loading}
          style={{
            ...primaryBtn,
            opacity: !themeReady || loading ? 0.5 : 1,
          }}
        >
          {loading ? "Génération…" : "Générer l'histoire →"}
        </button>
      </div>
    );
  }

  if (step === 3 && product && script) {
    return (
      <div className="create-shell">
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
        <div style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => setStep(2)} style={backBtn}>
            ← Retour au thème
          </button>
          <h2 className="create-title" style={{ marginBottom: 8 }}>
            {script.title}
          </h2>
          <p className="create-subtitle">
            History Ads — {script.scenes.length} actes · ~
            {script.totalDuration || script.scenes.length * 6}s
          </p>
        </div>
        <Step3Images
          product={product}
          script={script}
          images={images}
          onImageGenerated={(id, url) =>
            setImages((prev) => ({ ...prev, [id]: url }))
          }
          onNext={() => setStep(4)}
        />
      </div>
    );
  }

  if (step === 4 && product && script) {
    return (
      <div className="create-shell">
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
      </div>
    );
  }

  return null;
}
