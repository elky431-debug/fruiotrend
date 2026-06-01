"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AD_TEMPLATES,
  getTemplateConfig,
  normalizeAdTemplate,
} from "@/lib/adTemplates";
import {
  filterImageFiles,
  processProductImageFile,
} from "@/lib/processProductImage";
import type { AdTemplate, ProductInput } from "@/types/ad";

const AD_GOALS = [
  "Ventes directes",
  "Notoriété de marque",
  "Engagement TikTok",
  "Viral / Partage",
];

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

function validProductImages(imgs?: string[] | null): string[] {
  return (imgs ?? []).filter((s) => typeof s === "string" && s.length > 80);
}

function previewsFromImages(
  imgs: string[],
  mimes?: string[] | null
): string[] {
  return imgs.map(
    (data, i) =>
      `data:${mimes?.[i] || "image/jpeg"};base64,${data}`
  );
}

export default function Step1Product({ onNext, loading, initial }: Props) {
  const initialDuration = initial?.duration ?? 15;
  const [productName, setProductName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [audience, setAudience] = useState(
    initial?.targetAudience ?? "Femmes 18-35 ans"
  );
  const [goal, setGoal] = useState(initial?.adGoal ?? "Ventes directes");
  const [template, setTemplate] = useState<AdTemplate>(
    normalizeAdTemplate(initial?.template)
  );
  const [nScenes, setNScenes] = useState(initial?.nScenes ?? 1);
  const [duration, setDuration] = useState(initialDuration);
  const [images, setImages] = useState<string[]>(() =>
    validProductImages(initial?.images)
  );
  const [mimeTypes, setMimeTypes] = useState<string[]>(() => {
    const valid = validProductImages(initial?.images);
    return (initial?.imagesMimeType ?? []).slice(0, valid.length);
  });
  const [previews, setPreviews] = useState<string[]>(() =>
    previewsFromImages(
      validProductImages(initial?.images),
      initial?.imagesMimeType
    )
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [packagingImage, setPackagingImage] = useState<ProductInput["packagingImage"]>(
    initial?.packagingImage ?? null
  );
  const [packagingUploading, setPackagingUploading] = useState(false);
  const [packagingError, setPackagingError] = useState<string | null>(null);
  const fileInputId = useId();
  const packagingInputId = useId();
  const imagesRef = useRef<string[]>(images);
  const mimeRef = useRef<string[]>(mimeTypes);
  const previewsRef = useRef<string[]>(previews);

  useEffect(() => {
    imagesRef.current = images;
    mimeRef.current = mimeTypes;
    previewsRef.current = previews;
  }, [images, mimeTypes, previews]);

  const photoCount = images.length;
  const canAddPhotos = !uploading && photoCount < 5;

  useEffect(() => {
    if (!initial?.images?.length) return;
    const valid = validProductImages(initial.images);
    setImages(valid);
    setMimeTypes((initial.imagesMimeType ?? []).slice(0, valid.length));
    setPreviews(previewsFromImages(valid, initial.imagesMimeType));
    setPackagingImage(initial.packagingImage ?? null);
  }, [initial]);

  const selectTemplate = (id: AdTemplate) => {
    setTemplate(id);
  };

  const addImageFiles = async (fileList: FileList | File[]) => {
    const files = filterImageFiles(fileList);
    if (files.length === 0) {
      setUploadOk(null);
      setUploadError(
        "Aucune image reconnue. Utilisez JPG ou PNG (pas HEIC)."
      );
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadOk(null);

    let added = 0;
    const newImages = [...imagesRef.current];
    const newMimes = [...mimeRef.current];
    const newPreviews = [...previewsRef.current];

    for (const file of files) {
      if (newImages.length >= 5) {
        setUploadError("Maximum 5 photos.");
        break;
      }

      try {
        const { base64, mimeType, previewUrl } =
          await processProductImageFile(file);
        newImages.push(base64);
        newMimes.push(mimeType);
        newPreviews.push(previewUrl);
        added += 1;
      } catch (e) {
        setUploadError(
          e instanceof Error ? e.message : "Impossible d'ajouter la photo."
        );
        break;
      }
    }

    if (added > 0) {
      imagesRef.current = newImages;
      mimeRef.current = newMimes;
      previewsRef.current = newPreviews;
      setImages(newImages);
      setMimeTypes(newMimes);
      setPreviews(newPreviews);
      setUploadOk(
        added === 1 ? "1 photo ajoutée ✓" : `${added} photos ajoutées ✓`
      );
    }

    setUploading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const input = e.target;
    if (!files?.length) return;

    void addImageFiles(files).finally(() => {
      input.value = "";
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (uploading || images.length >= 5) return;
    if (e.dataTransfer.files?.length) {
      await addImageFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (idx: number) => {
    const nextImages = images.filter((_, i) => i !== idx);
    const nextMimes = mimeTypes.filter((_, i) => i !== idx);
    const nextPreviews = previews.filter((_, i) => i !== idx);
    imagesRef.current = nextImages;
    mimeRef.current = nextMimes;
    previewsRef.current = nextPreviews;
    setImages(nextImages);
    setMimeTypes(nextMimes);
    setPreviews(nextPreviews);
    setUploadError(null);
    setUploadOk(null);
  };

  const clearAllPhotos = () => {
    imagesRef.current = [];
    mimeRef.current = [];
    previewsRef.current = [];
    setImages([]);
    setMimeTypes([]);
    setPreviews([]);
    setUploadError(null);
    setUploadOk(null);
  };

  const handlePackagingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    setPackagingUploading(true);
    setPackagingError(null);

    try {
      const { base64, mimeType, previewUrl } = await processProductImageFile(file);
      setPackagingImage({
        base64,
        mimeType,
        url: previewUrl,
      });
    } catch (err) {
      setPackagingError(
        err instanceof Error ? err.message : "Impossible d'ajouter le packaging."
      );
    } finally {
      setPackagingUploading(false);
      input.value = "";
    }
  };

  const removePackaging = () => {
    setPackagingImage(null);
    setPackagingError(null);
  };

  const canContinue =
    Boolean(productName.trim()) &&
    Boolean(description.trim()) &&
    images.length > 0 &&
    Boolean(template);

  const submit = () => {
    if (!canContinue || loading) return;
    console.log("[STEP1] Génération — template:", template);
    onNext({
      name: productName.trim(),
      description: description.trim(),
      targetAudience: audience,
      adGoal: goal,
      template,
      nScenes,
      duration,
      images,
      imagesMimeType: mimeTypes,
      packagingImage: packagingImage ?? null,
    });
  };

  const selectedMeta = getTemplateConfig(template);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="studio-section">
        <div className="studio-section-head">
          <div className="step-badge">1</div>
          <div>
            <div className="step-title">Photos du produit</div>
            <div className="step-sub">
              {photoCount}/5 photos · fond blanc recommandé
            </div>
          </div>
        </div>

        <label
          className="product-upload-zone"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canAddPhotos) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={handleDrop}
          style={{
            position: "relative",
            display: "block",
            marginTop: 12,
            border: `1.5px dashed ${
              dragOver ? "var(--accent-warm)" : "var(--border)"
            }`,
            borderRadius: 14,
            padding: "28px 16px",
            cursor: canAddPhotos ? "pointer" : "not-allowed",
            background: dragOver
              ? "rgba(255, 92, 157, 0.08)"
              : "var(--bg3)",
            opacity: canAddPhotos ? 1 : 0.65,
          }}
        >
          <input
            id={fileInputId}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
            multiple
            onChange={handleImageUpload}
            disabled={!canAddPhotos}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 26 }}>{uploading ? "⏳" : "📸"}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {uploading
                ? "Import en cours…"
                : images.length >= 5
                  ? "5 photos maximum"
                  : "Cliquer ou glisser vos photos"}
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>
              JPG, PNG, WebP · max 5
            </span>
          </div>
        </label>

        {canAddPhotos && (
          <button
            type="button"
            onClick={() => document.getElementById(fileInputId)?.click()}
            className="btn-sec"
            style={{ marginTop: 10, width: "100%", fontSize: 12 }}
          >
            Parcourir mes fichiers…
          </button>
        )}

        {photoCount >= 5 && (
          <button
            type="button"
            onClick={clearAllPhotos}
            className="btn-sec"
            style={{ marginTop: 10, width: "100%", fontSize: 12 }}
          >
            Supprimer toutes les photos et recommencer
          </button>
        )}

        {uploadError && (
          <p
            role="alert"
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#ff8fa3",
              lineHeight: 1.45,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(227, 43, 69, 0.12)",
              border: "1px solid rgba(227, 43, 69, 0.35)",
            }}
          >
            {uploadError}
          </p>
        )}

        {uploadOk && !uploadError && (
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#86efac",
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
            }}
          >
            {uploadOk}
          </p>
        )}

        {previews.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--accent-warm)",
                marginBottom: 8,
              }}
            >
              {previews.length} photo{previews.length > 1 ? "s" : ""} ajoutée
              {previews.length > 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {previews.map((p, i) => (
              <div key={`${i}-${p.slice(0, 32)}`} style={{ position: "relative", width: 72, height: 72 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
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
                    fontSize: 9,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>📦</span>
            <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
              Packaging{" "}
              <span style={{ color: "var(--text3)", fontWeight: 400 }}>
                (optionnel)
              </span>
            </span>
          </div>
          <p
            style={{
              color: "var(--text2)",
              fontSize: 12,
              marginBottom: 12,
              lineHeight: 1.45,
            }}
          >
            Photo de votre boîte, sachet ou étiquette — le personnage la tiendra
            dans la vidéo
          </p>

          {packagingImage ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={packagingImage.url}
                alt="Packaging"
                style={{
                  width: 60,
                  height: 60,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />
              <div>
                <p style={{ color: "var(--text)", fontSize: 13 }}>
                  Packaging ajouté ✅
                </p>
                <button
                  type="button"
                  onClick={removePackaging}
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
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <label htmlFor={packagingInputId} style={{ cursor: "pointer", display: "block" }}>
              <div
                style={{
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  textAlign: "center",
                  color: "var(--text2)",
                  fontSize: 13,
                }}
              >
                {packagingUploading
                  ? "Import en cours…"
                  : "+ Ajouter une photo du packaging"}
              </div>
              <input
                id={packagingInputId}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                disabled={packagingUploading}
                onChange={(e) => void handlePackagingUpload(e)}
              />
            </label>
          )}

          {packagingError && (
            <p
              role="alert"
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#ff8fa3",
              }}
            >
              {packagingError}
            </p>
          )}
        </div>
      </section>

      <section className="studio-section">
        <div className="step-title" style={{ marginBottom: 12 }}>
          Description du produit
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="field-label">Nom</label>
            <input
              className="field-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ceinture de massage chauffante"
            />
          </div>
          <div>
            <label className="field-label">Description et bénéfices</label>
            <textarea
              className="field-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Soulage les douleurs lombaires en 15 min..."
            />
          </div>
        </div>
      </section>

      <section className="studio-section">
        <div className="step-title" style={{ marginBottom: 12 }}>
          Paramètres de la pub
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            className="field-label"
            style={{ display: "block", marginBottom: 12 }}
          >
            Format de pub
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            {AD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t.id)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  border: `1px solid ${template === t.id ? "rgba(227, 43, 69, 0.45)" : "var(--border)"}`,
                  background:
                    template === t.id
                      ? "rgba(227, 43, 69, 0.08)"
                      : "var(--bg2)",
                  transition: "all 0.15s",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{t.emoji}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: template === t.id ? "var(--accent)" : "var(--text)",
                    marginBottom: 3,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text2)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.description}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                  }}
                >
                  {t.bestFor.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 9,
                        padding: "1px 6px",
                        borderRadius: 99,
                        background: "var(--bg3)",
                        color: "var(--text3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          <p
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--text2)",
            }}
          >
            Recommandé: {selectedMeta.scenes} scènes · {selectedMeta.hook_style}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Nombre de scènes
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNScenes(n)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: `1px solid ${
                    nScenes === n ? "rgba(255,92,157,0.45)" : "var(--border)"
                  }`,
                  background:
                    nScenes === n ? "rgba(255,92,157,0.1)" : "var(--bg2)",
                  color: nScenes === n ? "var(--accent-warm)" : "var(--text2)",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.12s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
            {nScenes * 5}-{nScenes * 7} secondes estimées
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Durée de la pub
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { s: 15, label: "15s", desc: "TikTok hook" },
              { s: 30, label: "30s", desc: "Standard" },
              { s: 45, label: "45s", desc: "Long form" },
            ].map((d) => (
              <button
                key={d.s}
                type="button"
                onClick={() => setDuration(d.s)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 12,
                  border: `1px solid ${
                    duration === d.s
                      ? "rgba(255,92,157,0.45)"
                      : "var(--border)"
                  }`,
                  background:
                    duration === d.s
                      ? "rgba(255,92,157,0.1)"
                      : "var(--bg2)",
                  color:
                    duration === d.s ? "var(--accent-warm)" : "var(--text2)",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>{d.label}</div>
                <div style={{ fontSize: 10, marginTop: 2 }}>{d.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
            → {nScenes} scène{nScenes > 1 ? "s" : ""} de ~
            {Math.round(duration / nScenes)}s chacune
          </div>
        </div>

        <label className="field-label">Cible</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 }}>
          {AUDIENCES.map((a) => (
            <Chip key={a} active={audience === a} onClick={() => setAudience(a)}>
              {a}
            </Chip>
          ))}
        </div>

        <label className="field-label">Objectif</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {AD_GOALS.map((g) => (
            <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={submit}
        disabled={!canContinue || loading}
        className="btn-primary"
        style={{ width: "100%", opacity: !canContinue || loading ? 0.6 : 1 }}
      >
        {loading
          ? "Génération du script…"
          : canContinue
            ? `✦ Générer la pub « ${selectedMeta.name} » →`
            : "Photo + description requises"}
      </button>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-sec"
      style={{
        padding: "4px 10px",
        fontSize: 11,
        borderColor: active ? "rgba(255,92,157,0.4)" : undefined,
        color: active ? "var(--accent-warm)" : undefined,
      }}
    >
      {children}
    </button>
  );
}
