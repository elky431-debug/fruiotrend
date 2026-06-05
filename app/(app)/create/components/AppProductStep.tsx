"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  filterImageFiles,
  processProductImageFile,
} from "@/lib/processProductImage";
import type { InfluencerTraits, ProductInput } from "@/types/ad";
import { fetchInfluencerTraitsFromUpload } from "../lib/analyzeInfluencerUpload";
import {
  IconSmartphone,
  IconX,
  IconUser,
  IconBot,
  IconCamera,
  IconCheck,
  IconClapperboard,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
  IconRefresh,
} from "@/components/icons";

const PRESET_SCRIPTS = [
  {
    id: "probleme-solution",
    label: "Problème → Solution",
    example:
      '"Tu galères encore à faire ça manuellement ? Laisse-moi m\'en occuper."',
    structure: "Accroche douleur → l'appli résout tout → CTA",
  },
  {
    id: "chiffres",
    label: "Chiffres & Résultats",
    example:
      '"En 30 secondes, je fais ce qui te prenait 2 heures. Essaie-moi."',
    structure: "Résultat concret → temps/argent gagné → CTA",
  },
  {
    id: "curiosite",
    label: "Hook Curiosité",
    example: '"Tu connais pas encore cette appli ? Tu rates quelque chose."',
    structure: "Accroche mystérieuse → révélation → urgence",
  },
  {
    id: "temoignage",
    label: "Témoignage Utilisateur",
    example:
      '"Depuis que je l\'utilise, j\'ai économisé 300€ ce mois. C\'est réel."',
    structure: "Résultat personnel → avant/après → recommandation",
  },
  {
    id: "custom",
    label: "Écrire mon propre script",
    example: null,
    structure: "Tu écris exactement ce que dit le personnage",
  },
] as const;

const AUDIENCES = [
  "Femmes 18-35 ans",
  "Hommes 18-35 ans",
  "Parents",
  "Gamers",
  "Fitness",
  "Entrepreneurs",
  "Ados 13-20 ans",
];

interface Props {
  onNext: (data: ProductInput) => void;
  loading?: boolean;
  initial?: ProductInput | null;
}

type Screenshot = { base64: string; mimeType: string; url: string };

function initialScreenshots(initial?: ProductInput | null): Screenshot[] {
  if (!initial?.productType || initial.productType !== "app") return [];
  return (initial.images ?? []).map((base64, i) => ({
    base64,
    mimeType: initial.imagesMimeType?.[i] || "image/jpeg",
    url: `data:${initial.imagesMimeType?.[i] || "image/jpeg"};base64,${base64}`,
  }));
}

export default function AppProductStep({ onNext, loading, initial }: Props) {
  const appIsInitial = initial?.productType === "app";
  const [name, setName] = useState(appIsInitial ? initial?.name ?? "" : "");
  const [description, setDescription] = useState(
    appIsInitial ? initial?.description ?? "" : ""
  );
  const [screenshots, setScreenshots] = useState<Screenshot[]>(() =>
    initialScreenshots(initial)
  );
  const [scriptMode, setScriptMode] = useState<string>(
    appIsInitial ? initial?.scriptMode ?? "" : ""
  );
  const [customVoiceover, setCustomVoiceover] = useState(
    appIsInitial ? initial?.customVoiceover ?? "" : ""
  );
  const [duration, setDuration] = useState(
    appIsInitial ? initial?.duration ?? 15 : 15
  );
  const [audience, setAudience] = useState(
    appIsInitial ? initial?.targetAudience ?? AUDIENCES[0] : AUDIENCES[0]
  );
  const [influencerMode, setInfluencerMode] = useState<"ai" | "photo">(
    appIsInitial ? initial?.influencerMode ?? "ai" : "ai"
  );
  const [influencerImage, setInfluencerImage] = useState<
    ProductInput["influencerImage"]
  >(appIsInitial ? initial?.influencerImage ?? null : null);
  const [influencerTraits, setInfluencerTraits] = useState<
    InfluencerTraits | null
  >(appIsInitial ? initial?.influencerTraits ?? null : null);
  const [influencerBackgroundMode, setInfluencerBackgroundMode] = useState<
    "keep" | "change"
  >(appIsInitial ? initial?.influencerBackgroundMode ?? "change" : "change");
  const [influencerUploading, setInfluencerUploading] = useState(false);
  const [influencerError, setInfluencerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputId = useId();
  const influencerInputId = useId();
  const screenshotsRef = useRef<Screenshot[]>(screenshots);
  useEffect(() => {
    screenshotsRef.current = screenshots;
  }, [screenshots]);

  const nScenes = 1; // toujours 1 seule scène, même à 30s
  const wordCount = customVoiceover.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.round(wordCount / 2.3);
  // Le script personnalisé doit tenir dans la durée choisie (≈2.3 mots/s,
  // marge haute à 2.6) sinon la voix dépasse la vidéo → décalage labial.
  const maxWordsForDuration = Math.round(duration * 2.6);
  const minWordsForDuration = Math.max(6, Math.round(duration * 1.6));
  const customTooLong =
    scriptMode === "custom" && wordCount > maxWordsForDuration;
  const customTooShort =
    scriptMode === "custom" && wordCount > 0 && wordCount < minWordsForDuration;
  const canAddScreenshots = !uploading && screenshots.length < 4;

  const addScreenshotFiles = async (fileList: FileList | File[]) => {
    const files = filterImageFiles(fileList);
    if (files.length === 0) {
      setUploadError("Aucune image reconnue. Utilisez JPG ou PNG (pas HEIC).");
      return;
    }
    setUploading(true);
    setUploadError(null);

    const next = [...screenshotsRef.current];
    for (const file of files) {
      if (next.length >= 4) {
        setUploadError("Maximum 4 screenshots.");
        break;
      }
      try {
        const { base64, mimeType, previewUrl } =
          await processProductImageFile(file);
        next.push({ base64, mimeType, url: previewUrl });
      } catch (e) {
        setUploadError(
          e instanceof Error ? e.message : "Impossible d'ajouter l'image."
        );
        break;
      }
    }
    screenshotsRef.current = next;
    setScreenshots(next);
    setUploading(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files?.length) return;
    void addScreenshotFiles(input.files).finally(() => {
      input.value = "";
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!canAddScreenshots) return;
    if (e.dataTransfer.files?.length) {
      await addScreenshotFiles(e.dataTransfer.files);
    }
  };

  const removeScreenshot = (idx: number) => {
    const next = screenshots.filter((_, i) => i !== idx);
    screenshotsRef.current = next;
    setScreenshots(next);
  };

  const handleInfluencerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    setInfluencerUploading(true);
    setInfluencerError(null);
    try {
      const { base64, mimeType, previewUrl } =
        await processProductImageFile(file);
      const asset = { base64, mimeType, url: previewUrl };
      setInfluencerImage(asset);
      setInfluencerTraits(null);

      const traits = await fetchInfluencerTraitsFromUpload(asset);
      if (traits) {
        setInfluencerTraits(traits);
        console.log(
          "[APP] Traits influenceur:",
          traits.gender,
          traits.hairColor,
          traits.skinTone
        );
      } else {
        setInfluencerError(
          "Photo ajoutée, mais l'analyse des traits a échoué — réessaie une photo plus nette."
        );
      }
    } catch (err) {
      setInfluencerError(
        err instanceof Error ? err.message : "Impossible d'ajouter la photo."
      );
    } finally {
      setInfluencerUploading(false);
      input.value = "";
    }
  };

  const canContinue =
    Boolean(name.trim()) &&
    Boolean(description.trim()) &&
    Boolean(scriptMode) &&
    (scriptMode !== "custom" ||
      (Boolean(customVoiceover.trim()) && !customTooLong));

  const submit = () => {
    if (!canContinue || loading) return;
    const input: ProductInput = {
      name: name.trim(),
      description: description.trim(),
      targetAudience: audience,
      adGoal: "Téléchargements / Installs",
      template: "influencer",
      nScenes,
      duration,
      images: screenshots.map((s) => s.base64),
      imagesMimeType: screenshots.map((s) => s.mimeType),
      packagingImage: null,
      influencerMode,
      influencerImage: influencerMode === "photo" ? influencerImage ?? null : null,
      influencerTraits:
        influencerMode === "photo" ? influencerTraits ?? null : null,
      influencerBackgroundMode:
        influencerMode === "photo" ? influencerBackgroundMode : undefined,
      productType: "app",
      scriptMode,
      customVoiceover: customVoiceover.trim(),
    };
    onNext(input);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--text2)" }}>
            <IconSmartphone size={18} />
          </span>
          <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: 0 }}>
            Screenshots de l&apos;appli
          </h3>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            (optionnel)
          </span>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          L&apos;IA reproduira ton interface sur le smartphone du personnage
        </p>

        <label
          htmlFor={fileInputId}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canAddScreenshots) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={handleDrop}
          style={{
            display: "block",
            border: `1.5px dashed ${
              dragOver ? "var(--accent-warm)" : "rgba(255,255,255,0.15)"
            }`,
            borderRadius: 12,
            padding: "22px 16px",
            textAlign: "center",
            cursor: canAddScreenshots ? "pointer" : "not-allowed",
            background: dragOver ? "rgba(255,92,157,0.08)" : "rgba(0,0,0,0.2)",
            opacity: canAddScreenshots ? 1 : 0.65,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              color: "var(--accent-warm)",
              marginBottom: 6,
            }}
          >
            {uploading ? <IconRefresh size={24} /> : <IconSmartphone size={24} />}
          </div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
            {uploading
              ? "Import en cours…"
              : screenshots.length >= 4
                ? "4 screenshots maximum"
                : "Cliquer ou glisser tes screenshots"}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 11,
              marginTop: 4,
            }}
          >
            JPG, PNG, WebP · max 4
          </div>
          <input
            id={fileInputId}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp"
            multiple
            style={{ display: "none" }}
            disabled={!canAddScreenshots}
            onChange={handleUpload}
          />
        </label>

        {uploadError && (
          <p role="alert" style={{ marginTop: 10, fontSize: 12, color: "#ff8fa3" }}>
            {uploadError}
          </p>
        )}

        {screenshots.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {screenshots.map((s, i) => (
              <div
                key={`${i}-${s.url.slice(0, 24)}`}
                style={{ position: "relative", width: 60, height: 90 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "#EF4444",
                    color: "#fff",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconX size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <label
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 1 }}
        >
          NOM DE L&apos;APPLI / SITE
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: MonBudget, Fitnow, ShopEasy..."
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            padding: "10px 14px",
            marginTop: 6,
            marginBottom: 14,
          }}
        />

        <label
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 1 }}
        >
          CE QUE FAIT L&apos;APPLI + SON BÉNÉFICE PRINCIPAL
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Une appli de budget qui analyse tes dépenses et t'aide à économiser 300€/mois automatiquement"
          rows={3}
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            padding: "10px 14px",
            marginTop: 6,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <IconUser size={16} /> Personnage présentateur
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          L&apos;IA crée un personnage Pixar qui tient le smartphone, ou
          transforme ta photo en style cartoon.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(
            [
              { mode: "ai", label: "🤖 Généré par l'IA" },
              { mode: "photo", label: "📸 Envoyer une photo" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => {
                setInfluencerMode(opt.mode);
                if (opt.mode === "ai") setInfluencerTraits(null);
              }}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${
                  influencerMode === opt.mode
                    ? "#E8313A"
                    : "rgba(255,255,255,0.1)"
                }`,
                fontFamily: "inherit",
                background:
                  influencerMode === opt.mode
                    ? "rgba(232,49,58,0.14)"
                    : "rgba(255,255,255,0.06)",
                color: "#fff",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {influencerMode === "photo" &&
          (influencerImage ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={influencerImage.url}
                alt="Influenceur"
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  borderRadius: 28,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
              <div>
                <p style={{ color: "#fff", fontSize: 13 }}>Photo ajoutée ✅</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  L&apos;IA va la transformer en style Pixar
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInfluencerImage(null);
                    setInfluencerTraits(null);
                  }}
                  style={{
                    color: "#ff6666",
                    fontSize: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    marginTop: 4,
                  }}
                >
                  Changer
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor={influencerInputId}
              style={{ cursor: "pointer", display: "block" }}
            >
              <div
                style={{
                  border: "2px dashed rgba(232,49,58,0.4)",
                  borderRadius: 12,
                  padding: 18,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 22, marginBottom: 6 }}>👤</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  {influencerUploading
                    ? "Import en cours…"
                    : "Clique pour uploader une photo de l'influenceur"}
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  JPG, PNG — photo claire, visage visible
                </p>
              </div>
              <input
                id={influencerInputId}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                disabled={influencerUploading}
                onChange={(e) => void handleInfluencerUpload(e)}
              />
            </label>
          ))}

        {influencerMode === "photo" && influencerImage && (
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Décor de la pub
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  {
                    mode: "keep" as const,
                    label: "🖼 Garder le décor de la photo",
                    sub: "Même fond que ta photo",
                  },
                  {
                    mode: "change" as const,
                    label: "🎬 Nouveau décor",
                    sub: "Décor généré selon l'appli",
                  },
                ]
              ).map((opt) => {
                const active = influencerBackgroundMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setInfluencerBackgroundMode(opt.mode)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      border: `1px solid ${
                        active ? "#E8313A" : "rgba(255,255,255,0.1)"
                      }`,
                      background: active
                        ? "rgba(232,49,58,0.14)"
                        : "rgba(255,255,255,0.04)",
                      color: "#fff",
                    }}
                  >
                    <span
                      style={{ display: "block", fontSize: 13, fontWeight: 600 }}
                    >
                      {opt.label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        marginTop: 2,
                      }}
                    >
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {influencerError && (
          <p role="alert" style={{ marginTop: 10, fontSize: 12, color: "#ff8fa3" }}>
            {influencerError}
          </p>
        )}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3
          style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 16 }}
        >
          🎬 Style du script
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PRESET_SCRIPTS.map((script) => {
            const active = scriptMode === script.id;
            return (
              <div
                key={script.id}
                onClick={() => setScriptMode(script.id)}
                style={{
                  background: active
                    ? "rgba(232,49,58,0.1)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    active ? "#E8313A" : "rgba(255,255,255,0.07)"
                  }`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                    {script.label}
                  </span>
                  {active && (
                    <span style={{ color: "#E8313A", fontSize: 16 }}>✓</span>
                  )}
                </div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    margin: "4px 0 0",
                  }}
                >
                  {script.structure}
                </p>
                {script.example && active && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      margin: "8px 0 0",
                      fontStyle: "italic",
                      borderLeft: "2px solid #E8313A",
                      paddingLeft: 10,
                    }}
                  >
                    {script.example}
                  </p>
                )}

                {script.id === "custom" && active && (
                  <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={customVoiceover}
                      onChange={(e) => setCustomVoiceover(e.target.value)}
                      placeholder={
                        'Ex: "Tu passes encore des heures sur les tableurs ? Je fais tout ça en 10 secondes. Télécharge-moi."'
                      }
                      rows={4}
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 13,
                        padding: "10px 12px",
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.6,
                      }}
                    />
                    <p
                      style={{
                        color: customTooLong
                          ? "#ff8fa3"
                          : "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        marginTop: 6,
                      }}
                    >
                      {wordCount} mots · ~{estimatedDuration}s — cible :{" "}
                      {minWordsForDuration}–{maxWordsForDuration} mots pour{" "}
                      {duration}s
                    </p>
                    {customTooLong && (
                      <p
                        role="alert"
                        style={{
                          color: "#ff8fa3",
                          fontSize: 11,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        ⚠️ Trop long pour {duration}s : retire{" "}
                        {wordCount - maxWordsForDuration} mot
                        {wordCount - maxWordsForDuration > 1 ? "s" : ""} ou passe
                        la durée à {duration === 15 ? "30s" : "une valeur plus longue"}.
                        Sinon la voix dépasse la vidéo et le personnage se fige.
                      </p>
                    )}
                    {customTooShort && (
                      <p
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 11,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        Un peu court pour {duration}s — ajoute quelques mots pour
                        remplir la vidéo.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <label
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 1 }}
        >
          CIBLE
        </label>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
        >
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                border: `1px solid ${
                  audience === a ? "#E8313A" : "rgba(255,255,255,0.12)"
                }`,
                background:
                  audience === a ? "rgba(232,49,58,0.12)" : "transparent",
                color: audience === a ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3
          style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 12 }}
        >
          ⏱ Durée de la pub
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { s: 15, label: "15s", sub: "TikTok Hook" },
            { s: 30, label: "30s", sub: "Standard" },
          ].map((opt) => (
            <button
              key={opt.s}
              type="button"
              onClick={() => setDuration(opt.s)}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background:
                  duration === opt.s ? "#E8313A" : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              {opt.label}
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  opacity: 0.7,
                  fontWeight: 400,
                }}
              >
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 11,
            marginTop: 8,
          }}
        >
          → {nScenes} scène{nScenes > 1 ? "s" : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canContinue || loading}
        style={{
          width: "100%",
          padding: "16px 0",
          background: "linear-gradient(90deg, #E8313A, #ff6b35)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          cursor: !canContinue || loading ? "not-allowed" : "pointer",
          opacity: !canContinue || loading ? 0.5 : 1,
        }}
      >
        {loading
          ? "Génération du script…"
          : scriptMode === "custom"
            ? "Créer la pub →"
            : "Générer le script →"}
      </button>
    </div>
  );
}
