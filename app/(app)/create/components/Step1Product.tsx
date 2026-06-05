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
import type { AdTemplate, InfluencerTraits, ProductInput } from "@/types/ad";
import { fetchInfluencerTraitsFromUpload } from "../lib/analyzeInfluencerUpload";
import {
  IconCamera,
  IconImage,
  IconBox,
  IconX,
  IconCheck,
  IconUser,
  IconBot,
  IconClapperboard,
  IconPencil,
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconRefresh,
} from "@/components/icons";

const AD_GOALS = [
  "Ventes directes",
  "Notoriété de marque",
  "Engagement TikTok",
  "Viral / Partage",
];

const TEMPLATE_MEDIA: Record<string, string> = {
  living_product: "/landing/pubmoi-produit-vivant.png",
  influencer: "/landing/pubmoi-influenceur.png",
  product_demo: "/landing/pubmoi-demo-produit.png",
};

const TEMPLATE_ICON: Record<string, React.ReactNode> = {
  living_product: <IconBox size={16} />,
  influencer: <IconUser size={16} />,
  product_demo: <IconCamera size={16} />,
};

function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`reveal-item${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

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
  onWriteOwnScript?: (data: ProductInput) => void;
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

export default function Step1Product({
  onNext,
  onWriteOwnScript,
  loading,
  initial,
}: Props) {
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
  const [influencerMode, setInfluencerMode] = useState<"ai" | "photo">(
    initial?.influencerMode ?? "ai"
  );
  const [influencerImage, setInfluencerImage] = useState<
    ProductInput["influencerImage"]
  >(initial?.influencerImage ?? null);
  const [influencerTraits, setInfluencerTraits] = useState<
    InfluencerTraits | null
  >(initial?.influencerTraits ?? null);
  const [influencerBackgroundMode, setInfluencerBackgroundMode] = useState<
    "keep" | "change"
  >(initial?.influencerBackgroundMode ?? "change");
  const [influencerUploading, setInfluencerUploading] = useState(false);
  const [influencerError, setInfluencerError] = useState<string | null>(null);
  const [subStep, setSubStep] = useState(0);
  const fileInputId = useId();
  const packagingInputId = useId();
  const influencerInputId = useId();
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
    setInfluencerMode(initial.influencerMode ?? "ai");
    setInfluencerImage(initial.influencerImage ?? null);
    setInfluencerTraits(initial.influencerTraits ?? null);
    setInfluencerBackgroundMode(initial.influencerBackgroundMode ?? "change");
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
        added === 1 ? "1 photo ajoutée" : `${added} photos ajoutées`
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
          "[STEP1] Traits influenceur:",
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
    Boolean(productName.trim()) &&
    Boolean(description.trim()) &&
    images.length > 0 &&
    Boolean(template);

  const buildInput = (): ProductInput => ({
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
    influencerMode: template === "influencer" ? influencerMode : undefined,
    influencerImage:
      template === "influencer" && influencerMode === "photo"
        ? influencerImage ?? null
        : null,
    influencerTraits:
      template === "influencer" && influencerMode === "photo"
        ? influencerTraits ?? null
        : null,
    influencerBackgroundMode:
      template === "influencer" && influencerMode === "photo"
        ? influencerBackgroundMode
        : undefined,
  });

  const submit = () => {
    if (!canContinue || loading) return;
    console.log("[STEP1] Génération — template:", template);
    onNext(buildInput());
  };

  const writeOwn = () => {
    if (!canContinue || loading) return;
    onWriteOwnScript?.(buildInput());
  };

  const selectedMeta = getTemplateConfig(template);

  // Découpage en 4 sous-étapes légères (mobile-friendly) : Photos → Produit →
  // Style → Réglages. Chaque écran ne montre qu'un bloc d'infos à la fois.
  const SUB_STEPS = ["Photos", "Produit", "Style", "Réglages"];
  const stepValid = [
    images.length > 0,
    Boolean(productName.trim()) && Boolean(description.trim()),
    Boolean(template),
    canContinue,
  ];
  const goNextSub = () => {
    if (!stepValid[subStep]) return;
    setSubStep((s) => Math.min(SUB_STEPS.length - 1, s + 1));
  };
  const goPrevSub = () => setSubStep((s) => Math.max(0, s - 1));
  const jumpToSub = (target: number) => {
    if (target <= subStep) {
      setSubStep(target);
      return;
    }
    // On n'autorise à avancer que si toutes les étapes précédentes sont valides.
    for (let i = 0; i < target; i++) {
      if (!stepValid[i]) return;
    }
    setSubStep(target);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {subStep === 0 && (
      <Reveal delay={0}>
        <div className="create-hero">
          <div className="create-hero-text">
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 4,
              }}
            >
              Transforme ton produit en pub 3D
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
              Ajoute tes photos, choisis un style, et l&apos;IA génère une pub
              cinématographique prête à poster.
            </div>
          </div>
          <div className="create-hero-thumbs" aria-hidden="true">
            {Object.values(TEMPLATE_MEDIA).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="create-hero-thumb" />
            ))}
          </div>
        </div>
      </Reveal>
      )}

      <SubStepper
        steps={SUB_STEPS}
        current={subStep}
        valid={stepValid}
        onJump={jumpToSub}
      />

      {subStep === 0 && (
      <section className="studio-section reveal-item" style={{ animationDelay: "90ms" }}>
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
            <span
              style={{
                display: "inline-flex",
                color: "var(--accent-warm)",
              }}
            >
              {uploading ? <IconRefresh size={26} /> : <IconCamera size={26} />}
            </span>
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
            <span style={{ display: "inline-flex", color: "var(--text2)" }}>
              <IconBox size={16} />
            </span>
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
                <p
                  style={{
                    color: "var(--text)",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconCheck size={14} /> Packaging ajouté
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
      )}

      {subStep === 1 && (
      <section className="studio-section reveal-item" style={{ animationDelay: "170ms" }}>
        <div className="step-title" style={{ marginBottom: 12 }}>
          Description du produit
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Reveal delay={230}>
            <label className="field-label">Nom</label>
            <input
              className="field-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ceinture de massage chauffante"
            />
          </Reveal>
          <Reveal delay={290}>
            <label className="field-label">Description et bénéfices</label>
            <textarea
              className="field-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Soulage les douleurs lombaires en 15 min..."
            />
          </Reveal>
        </div>
      </section>
      )}

      {subStep === 2 && (
      <section className="studio-section reveal-item" style={{ animationDelay: "260ms" }}>
        <div className="step-title" style={{ marginBottom: 12 }}>
          Style &amp; format
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            className="field-label"
            style={{ display: "block", marginBottom: 12 }}
          >
            Format de pub
          </label>
          <div className="tpl-grid">
            {AD_TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t.id)}
                className={`tpl-card reveal-item${template === t.id ? " is-active" : ""}`}
                style={{ animationDelay: `${320 + i * 70}ms` }}
              >
                <div className="tpl-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TEMPLATE_MEDIA[t.id]} alt={t.name} />
                  <span className="tpl-card-emoji">
                    {TEMPLATE_ICON[t.id] ?? null}
                  </span>
                  <span className="tpl-card-check">
                    <IconCheck size={12} />
                  </span>
                </div>
                <div className="tpl-card-body">
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: template === t.id ? "var(--accent)" : "var(--text)",
                      marginBottom: 4,
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
                      marginTop: 8,
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
                </div>
              </button>
            ))}
          </div>

          <div className="tpl-preview" key={template}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TEMPLATE_MEDIA[template]} alt={selectedMeta.name} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent-warm)",
                  marginBottom: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {TEMPLATE_ICON[template] ?? null} {selectedMeta.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {selectedMeta.description}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--text3)",
                }}
              >
                Recommandé : {selectedMeta.scenes} scènes ·{" "}
                {selectedMeta.hook_style}
              </div>
            </div>
          </div>

          {template === "influencer" && (
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed var(--border)",
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
              }}
            >
              <p
                style={{
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <IconUser size={15} /> Personnage influenceur
              </p>
              <p
                style={{
                  color: "var(--text2)",
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                L&apos;IA crée un personnage Pixar ou utilise ta photo
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(
                  [
                    {
                      mode: "ai",
                      label: "Généré par l'IA",
                      icon: <IconBot size={15} />,
                    },
                    {
                      mode: "photo",
                      label: "Envoyer une photo",
                      icon: <IconCamera size={15} />,
                    },
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
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      fontFamily: "inherit",
                      background:
                        influencerMode === opt.mode
                          ? "var(--accent)"
                          : "rgba(255,255,255,0.08)",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              {influencerMode === "photo" &&
                (influencerImage ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={influencerImage.url}
                      alt="Influenceur"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 32,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <div>
                      <p
                        style={{
                          color: "var(--text)",
                          fontSize: 13,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <IconCheck size={14} /> Photo ajoutée
                      </p>
                      <p style={{ color: "var(--text2)", fontSize: 12 }}>
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
                        padding: 20,
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          color: "var(--text3)",
                          marginBottom: 8,
                        }}
                      >
                        <IconUser size={24} />
                      </p>
                      <p style={{ color: "var(--text2)", fontSize: 13 }}>
                        {influencerUploading
                          ? "Import en cours…"
                          : "Clique pour uploader une photo de l'influenceur"}
                      </p>
                      <p
                        style={{
                          color: "var(--text3)",
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
                      color: "var(--text2)",
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
                          label: "Fond de ta photo en style Pixar",
                          sub: "Le décor de ta photo, transformé en style Pixar",
                        },
                        {
                          mode: "change" as const,
                          label: "Nouveau décor",
                          sub: "Décor généré selon le produit",
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
                              active ? "#E8313A" : "var(--border)"
                            }`,
                            background: active
                              ? "rgba(232,49,58,0.12)"
                              : "transparent",
                            color: "var(--text)",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {opt.label}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 11,
                              color: "var(--text2)",
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
                <p
                  role="alert"
                  style={{ marginTop: 10, fontSize: 12, color: "#ff8fa3" }}
                >
                  {influencerError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      )}

      {subStep === 3 && (
      <section className="studio-section reveal-item" style={{ animationDelay: "300ms" }}>
        <div className="step-title" style={{ marginBottom: 12 }}>
          Réglages
        </div>

        <div className="reveal-item" style={{ marginBottom: 16, animationDelay: "390ms" }}>
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

        <div className="reveal-item" style={{ marginBottom: 16, animationDelay: "440ms" }}>
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
            {nScenes} scène{nScenes > 1 ? "s" : ""} de ~
            {Math.round(duration / nScenes)}s chacune
          </div>
        </div>

        <div className="reveal-item" style={{ animationDelay: "490ms" }}>
          <label className="field-label">Cible</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 }}>
            {AUDIENCES.map((a) => (
              <Chip key={a} active={audience === a} onClick={() => setAudience(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>

        <div className="reveal-item" style={{ animationDelay: "540ms" }}>
          <label className="field-label">Objectif</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {AD_GOALS.map((g) => (
              <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
                {g}
              </Chip>
            ))}
          </div>
        </div>
      </section>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {subStep > 0 && (
          <button
            type="button"
            onClick={goPrevSub}
            className="btn-sec"
            style={{
              flex: 1,
              justifyContent: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconArrowLeft size={15} /> Retour
          </button>
        )}
        {subStep < SUB_STEPS.length - 1 && (
          <button
            type="button"
            onClick={goNextSub}
            disabled={!stepValid[subStep]}
            className="btn-primary"
            style={{
              flex: 2,
              justifyContent: "center",
              opacity: stepValid[subStep] ? 1 : 0.6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Suivant <IconArrowRight size={15} />
          </button>
        )}
      </div>

      {subStep === SUB_STEPS.length - 1 && (
      <>
      <button
        type="button"
        onClick={submit}
        disabled={!canContinue || loading}
        className="btn-primary reveal-item"
        style={{
          width: "100%",
          opacity: !canContinue || loading ? 0.6 : 1,
          animationDelay: "560ms",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {loading ? (
          "Génération du script…"
        ) : canContinue ? (
          <>
            <IconSparkles size={16} /> Générer la pub « {selectedMeta.name} »
            avec l&apos;IA <IconArrowRight size={15} />
          </>
        ) : (
          "Photo + description requises"
        )}
      </button>

      {onWriteOwnScript && (
        <button
          type="button"
          onClick={writeOwn}
          disabled={!canContinue || loading}
          className="btn-sec reveal-item"
          style={{
            width: "100%",
            justifyContent: "center",
            opacity: !canContinue || loading ? 0.6 : 1,
            animationDelay: "620ms",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <IconPencil size={15} /> Écrire mon script moi-même
        </button>
      )}
      </>
      )}
    </div>
  );
}

function SubStepper({
  steps,
  current,
  valid,
  onJump,
}: {
  steps: string[];
  current: number;
  valid: boolean[];
  onJump: (target: number) => void;
}) {
  return (
    <div
      className="scroll-x"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 0",
      }}
    >
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current && valid[i];
        return (
          <button
            key={label}
            type="button"
            onClick={() => onJump(i)}
            style={{
              flex: "1 1 0",
              minWidth: 64,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "2px 0",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                fontSize: 12,
                fontWeight: 700,
                color: active || done ? "#fff" : "var(--text2)",
                background: active
                  ? "var(--accent)"
                  : done
                    ? "rgba(34,197,94,0.85)"
                    : "var(--bg3)",
                border: `1px solid ${
                  active ? "var(--accent)" : "var(--border)"
                }`,
                transition: "all 0.15s",
              }}
            >
              {done ? <IconCheck size={13} /> : i + 1}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--accent-warm)" : "var(--text3)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
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
