"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { useCredits } from "@/hooks/useCredits";
import {
  IconSparkles,
  IconImage,
  IconDownload,
  IconX,
  IconBolt,
} from "@/components/icons";

const GOLD = "#ff5c9d";

const CUSTOM_REQUEST_SUGGESTIONS = [
  "Tons rosés et féminins",
  "Style minimaliste coréen",
  "Ambiance luxe haut de gamme",
  "Fond blanc uniquement",
  "Femme de 25-35 ans",
  "Inclure un chien",
  "Décor scandinave",
  "Couleurs vives et énergiques",
];

const SHOWCASE = [
  {
    src: "/creatives/showcase-packshot.png",
    label: "Packshot",
    desc: "Fond blanc, prêt pour Amazon",
  },
  {
    src: "/creatives/showcase-lifestyle.png",
    label: "Lifestyle",
    desc: "Mise en situation 100% réaliste",
  },
  {
    src: "/creatives/showcase-detail.png",
    label: "Macro détail",
    desc: "Gros plan texture & matière",
  },
  {
    src: "/creatives/showcase-flatlay.png",
    label: "Flat lay",
    desc: "Vue du dessus packagée",
  },
  {
    src: "/creatives/showcase-story.png",
    label: "Story",
    desc: "Format réseaux, espace texte",
  },
  {
    src: "/creatives/showcase-scale.png",
    label: "Échelle",
    desc: "Produit en main, taille réelle",
  },
];

const PLATFORMS = ["Amazon", "Etsy", "Instagram", "TikTok Shop", "Pinterest"];

const STEPS = [
  { n: "1", title: "Upload", desc: "1 à 3 photos de ton produit" },
  { n: "2", title: "Contexte", desc: "Bénéfice + demande spécifique" },
  { n: "3", title: "Génère", desc: "8 visuels carrés en ~30 s" },
];

type Creative = {
  id: string;
  name: string;
  description: string;
  aspectRatio: "1:1";
  imageBase64: string;
  mimeType: string;
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
};

export default function CreativesPage() {
  const { credits, refresh } = useCredits();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [benefit, setBenefit] = useState("");
  const [customRequest, setCustomRequest] = useState("");
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 3);
    setImages(next);
    setError(null);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => fileInputRef.current?.click(), 350);
  };

  const startFakeProgress = () => {
    setProgress(8);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 88 ? p + Math.random() * 6 : p));
    }, 700);
  };

  const stopProgress = (final: number) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
    setProgress(final);
  };

  const generate = async () => {
    if (!images.length || loading) return;
    setLoading(true);
    setError(null);
    setCreatives([]);
    startFakeProgress();

    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img));
      if (description.trim()) formData.append("description", description.trim());
      formData.append("benefit", benefit.trim() || "Qualité Premium");
      if (customRequest.trim()) {
        formData.append("customRequest", customRequest.trim());
      }

      const res = await authFetch("/api/creatives", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data?.error ||
            (res.status === 402
              ? "Crédits insuffisants pour générer des créatives."
              : "Échec de la génération. Réessaie.")
        );
        stopProgress(0);
        return;
      }

      setCreatives(data.creatives || []);
      stopProgress(100);
      refresh();
      window.dispatchEvent(new Event("credits-updated"));
    } catch {
      setError("Erreur réseau. Réessaie dans un instant.");
      stopProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const fileExt = (mime: string) =>
    mime.includes("webp") ? "webp" : mime.includes("png") ? "png" : "jpg";

  const download = (c: Creative) => {
    const link = document.createElement("a");
    link.href = `data:${c.mimeType};base64,${c.imageBase64}`;
    link.download = `pubmoi-creative-${c.id}.${fileExt(c.mimeType)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadAll = () => creatives.forEach(download);

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, rgba(255,92,157,0.12) 0%, rgba(10,7,5,0) 45%), #0a0705",
        minHeight: "100%",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@0,500;0,600;0,700&display=swap');
        .cr-serif{font-family:'Playfair Display',Georgia,serif;}
        .cr-card{transition:border-color .2s ease, transform .2s ease;}
        .cr-card:hover{border-color:rgba(255,92,157,0.28);transform:translateY(-3px);}
        .cr-drop{transition:border-color .2s ease, background .2s ease;}
        .cr-drop:hover{border-color:rgba(255,92,157,0.5);background:rgba(255,92,157,0.04);}
        .cr-field{transition:border-color .18s ease, box-shadow .18s ease;}
        .cr-field:focus{border-color:rgba(255,92,157,0.55);box-shadow:0 0 0 3px rgba(255,92,157,0.12);}
        .cr-field::placeholder{color:rgba(255,248,242,0.32);}
        .cr-chip{transition:border-color .18s ease, color .18s ease, background .18s ease;}
        .cr-chip:hover{border-color:rgba(255,92,157,0.45);color:#ff8fbf;background:rgba(255,92,157,0.06);}
        .cr-cta{transition:transform .18s ease, box-shadow .18s ease;}
        .cr-cta:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 34px -14px rgba(227,43,69,0.85);}
        .cr-shot{transition:transform .35s cubic-bezier(.2,.7,.3,1), box-shadow .35s ease;}
        .cr-shot:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 24px 50px -20px rgba(0,0,0,0.8);}
        @keyframes cr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes cr-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes cr-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .cr-hero-grid{display:grid;grid-template-columns:1.05fr 0.95fr;gap:48px;align-items:center;}
        @media (max-width: 900px){.cr-hero-grid{grid-template-columns:1fr;gap:32px;}.cr-collage{max-width:440px;margin:0 auto;}}
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px clamp(16px, 2.5vw, 40px) 80px",
        }}
      >
        {/* ============ HERO ============ */}
        <div className="cr-hero-grid" style={{ marginBottom: 56 }}>
          {/* Left — copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                borderRadius: 99,
                background: "rgba(255,92,157,0.12)",
                border: "1px solid rgba(255,92,157,0.3)",
                color: "#ff8fbf",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <IconSparkles size={14} /> Creatives Pro
            </div>
            <h1
              className="cr-serif"
              style={{
                fontSize: "clamp(34px, 4.4vw, 50px)",
                fontWeight: 600,
                color: "#fff8f2",
                lineHeight: 1.04,
                letterSpacing: "-0.015em",
                marginBottom: 18,
              }}
            >
              8 visuels marketing,
              <br />
              en un seul upload
              <span style={{ color: GOLD }}>.</span>
            </h1>
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.6,
                color: "rgba(255,248,242,0.55)",
                maxWidth: 480,
                marginBottom: 26,
              }}
            >
              Upload une photo de ton produit, l&apos;IA génère 8 créatives
              carrées (1:1) de qualité studio — packshot, lifestyle, macro, flat
              lay et plus. Texte incrusté côté serveur, sans fautes.
            </p>

            {/* Steps */}
            <div
              style={{
                display: "grid",
                gap: 14,
                marginBottom: 28,
                maxWidth: 420,
              }}
            >
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,92,157,0.12)",
                      border: "1px solid rgba(255,92,157,0.28)",
                      color: "#ff8fbf",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff8f2",
                      }}
                    >
                      {s.title}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(255,248,242,0.42)",
                        marginLeft: 8,
                      }}
                    >
                      {s.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={scrollToForm}
              className="cr-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "14px 28px",
                borderRadius: 12,
                border: "none",
                fontSize: 14.5,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                color: "#fff",
                background:
                  "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 45%, #e32b45 100%)",
                boxShadow: "0 10px 26px -12px rgba(227,43,69,0.7)",
              }}
            >
              <IconSparkles size={17} /> Créer mes visuels
            </button>

            {/* Platforms */}
            <div style={{ marginTop: 30 }}>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,248,242,0.3)",
                  marginBottom: 12,
                }}
              >
                Optimisé pour
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px 22px",
                  alignItems: "center",
                }}
              >
                {PLATFORMS.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,248,242,0.5)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — collage */}
          <div className="cr-collage" style={{ position: "relative" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  animation: "cr-float 7s ease-in-out infinite",
                }}
              >
                <ShotCard src={SHOWCASE[1].src} tag={SHOWCASE[1].label} />
                <ShotCard src={SHOWCASE[3].src} tag={SHOWCASE[3].label} />
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginTop: 34,
                  animation: "cr-float 7s ease-in-out infinite",
                  animationDelay: "1.2s",
                }}
              >
                <ShotCard src={SHOWCASE[4].src} tag={SHOWCASE[4].label} />
                <ShotCard src={SHOWCASE[0].src} tag={SHOWCASE[0].label} />
              </div>
            </div>

            {/* Floating badge */}
            <div
              style={{
                position: "absolute",
                bottom: -14,
                left: "50%",
                transform: "translateX(-50%)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                borderRadius: 99,
                background: "rgba(14,9,7,0.86)",
                border: "1px solid rgba(255,92,157,0.32)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 14px 30px -12px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap",
              }}
            >
              <IconBolt size={14} color="#ff8fbf" />
              <span
                style={{ fontSize: 12.5, fontWeight: 700, color: "#fff8f2" }}
              >
                1 photo
              </span>
              <span style={{ color: "rgba(255,248,242,0.35)" }}>→</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GOLD }}>
                8 créatives
              </span>
            </div>
          </div>
        </div>

        {/* ============ FORM ============ */}
        <div
          ref={formRef}
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            padding: "clamp(22px, 3vw, 34px)",
            marginBottom: 56,
            display: "grid",
            gap: 22,
            background:
              "linear-gradient(180deg, rgba(255,92,157,0.04), rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, rgba(255,92,157,0.7), transparent)",
            }}
          />

          {/* Step 1 — Upload */}
          <div style={{ display: "grid", gap: 12 }}>
            <SectionLabel n="1" title="Ta photo produit" />
            <div
              className="cr-drop"
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              style={{
                border: "1.5px dashed rgba(255,255,255,0.15)",
                borderRadius: 14,
                padding: previews.length ? "18px" : "44px 18px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => onFiles(e.target.files)}
              />
              {previews.length ? (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {previews.map((src, i) => (
                    <div key={src} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        style={{
                          width: 92,
                          height: 92,
                          objectFit: "contain",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        aria-label="Retirer l'image"
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "none",
                          background: "#e32b45",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    color: "rgba(255,248,242,0.55)",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg, rgba(255,92,157,0.18), rgba(227,43,69,0.12))",
                      border: "1px solid rgba(255,92,157,0.25)",
                      color: "#ff8fbf",
                    }}
                  >
                    <IconImage size={24} />
                  </div>
                  <div
                    style={{ fontSize: 14.5, fontWeight: 600, color: "#fff8f2" }}
                  >
                    Glisse ta photo produit ou clique pour uploader
                  </div>
                  <div style={{ fontSize: 12 }}>
                    JPG / PNG · jusqu&apos;à 3 photos
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — Contexte */}
          <div style={{ display: "grid", gap: 16 }}>
            <SectionLabel
              n="2"
              title="Contexte"
              hint="optionnel — l'IA analyse la photo automatiquement"
            />

            <div style={{ display: "grid", gap: 8 }}>
              <label
                style={{ fontSize: 12.5, color: "rgba(255,248,242,0.55)" }}
              >
                Bénéfice principal
              </label>
              <input
                className="cr-field"
                type="text"
                placeholder="ex : Soulage les tensions en 10 minutes"
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label
                style={{ fontSize: 12.5, color: "rgba(255,248,242,0.55)" }}
              >
                Description produit
              </label>
              <textarea
                className="cr-field"
                placeholder="Matière, couleurs, usage, catégorie…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label
                style={{ fontSize: 12.5, color: "rgba(255,248,242,0.55)" }}
              >
                Demande spécifique à l&apos;IA
              </label>
              <textarea
                className="cr-field"
                placeholder={`Ex : "Utilise des tons rosés et féminins" · "Montre une femme de 30 ans" · "Fond marbre blanc uniquement"`}
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CUSTOM_REQUEST_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="cr-chip"
                    onClick={() =>
                      setCustomRequest((prev) =>
                        prev ? `${prev}, ${s.toLowerCase()}` : s
                      )
                    }
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 12,
                      color: "rgba(255,248,242,0.55)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 13,
                color: "#ff9aa3",
                background: "rgba(232,49,58,0.1)",
                border: "1px solid rgba(232,49,58,0.35)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Step 3 — Generate */}
          <div style={{ display: "grid", gap: 14 }}>
            <button
              type="button"
              onClick={generate}
              disabled={loading || !images.length}
              className="cr-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                padding: "15px 28px",
                borderRadius: 12,
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: loading || !images.length ? "not-allowed" : "pointer",
                color: "#fff",
                opacity: !images.length ? 0.5 : 1,
                background:
                  loading || !images.length
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg, #ff6fae 0%, #ff3d6e 45%, #e32b45 100%)",
                boxShadow:
                  loading || !images.length
                    ? "none"
                    : "0 10px 26px -12px rgba(227,43,69,0.7)",
              }}
            >
              <IconSparkles size={17} />
              {loading
                ? `Génération en cours… ${Math.round(progress)}%`
                : "Générer mes 8 créatives"}
            </button>

            {loading && (
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 99,
                    background: "linear-gradient(90deg, #ff6fae, #e32b45)",
                    transition: "width .5s ease",
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                color: "rgba(255,248,242,0.45)",
              }}
            >
              <IconBolt size={13} color="#ff8fbf" />
              {credits !== null
                ? `${credits.toLocaleString("fr-FR")} crédits disponibles · 1 crédit par visuel`
                : "1 crédit par visuel généré"}
            </div>
          </div>
        </div>

        {/* ============ SKELETONS ============ */}
        {loading && creatives.length === 0 && (
          <div style={{ marginBottom: 56 }}>
            <h2
              className="cr-serif"
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#fff8f2",
                marginBottom: 18,
              }}
            >
              Génération de tes visuels…
            </h2>
            <div style={gridStyle}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...card,
                    aspectRatio: "1",
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)",
                    backgroundSize: "200% 100%",
                    animation: "cr-shimmer 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ============ RESULTS ============ */}
        {creatives.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <h2
                className="cr-serif"
                style={{ fontSize: 24, fontWeight: 600, color: "#fff8f2" }}
              >
                {creatives.length} créative{creatives.length > 1 ? "s" : ""}{" "}
                générée{creatives.length > 1 ? "s" : ""}
              </h2>
              <button
                type="button"
                onClick={downloadAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff8f2",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <IconDownload size={15} /> Tout télécharger
              </button>
            </div>

            <div style={gridStyle}>
              {creatives.map((c) => (
                <div
                  key={c.id}
                  className="cr-card"
                  style={{ ...card, overflow: "hidden" }}
                >
                  <div
                    style={{
                      position: "relative",
                      background: "rgba(0,0,0,0.35)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${c.mimeType};base64,${c.imageBase64}`}
                      alt={c.name}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 99,
                        background: "rgba(10,7,5,0.7)",
                        color: "#ff8fbf",
                        border: "1px solid rgba(255,92,157,0.3)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {c.aspectRatio}
                    </span>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#fff8f2",
                        marginBottom: 3,
                      }}
                    >
                      {c.name}
                    </p>
                    <p
                      style={{
                        color: "rgba(255,248,242,0.42)",
                        fontSize: 12,
                        marginBottom: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {c.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => download(c)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        width: "100%",
                        padding: "8px 14px",
                        borderRadius: 9,
                        background: "transparent",
                        border: "1px solid rgba(255,92,157,0.4)",
                        color: GOLD,
                        fontSize: 12.5,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <IconDownload size={14} /> Télécharger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ STYLES GALLERY ============ */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#ff8fbf",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              Aperçu des styles
            </p>
            <h2
              className="cr-serif"
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: 600,
                color: "#fff8f2",
                letterSpacing: "-0.01em",
              }}
            >
              Chaque upload décliné en plusieurs angles
            </h2>
          </div>

          <div style={galleryGridStyle}>
            {SHOWCASE.map((s, i) => (
              <div
                key={s.src}
                className="cr-shot"
                style={{
                  ...card,
                  overflow: "hidden",
                  animation: `cr-fade .5s ease both`,
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt={s.label}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, transparent 55%, rgba(10,7,5,0.85) 100%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      bottom: 12,
                      right: 14,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: "#fff8f2",
                        marginBottom: 2,
                      }}
                    >
                      {s.label}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,248,242,0.6)",
                      }}
                    >
                      {s.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShotCard({ src, tag }: { src: string; tag: string }) {
  return (
    <div
      className="cr-shot"
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 40px -22px rgba(0,0,0,0.85)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={tag}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          display: "block",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 9,
          left: 9,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.03em",
          padding: "3px 8px",
          borderRadius: 99,
          background: "rgba(10,7,5,0.62)",
          color: "#fff8f2",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(6px)",
        }}
      >
        {tag}
      </span>
    </div>
  );
}

function SectionLabel({
  n,
  title,
  hint,
}: {
  n: string;
  title: string;
  hint?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,92,157,0.12)",
          border: "1px solid rgba(255,92,157,0.28)",
          color: "#ff8fbf",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#fff8f2" }}>
        {title}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "rgba(255,248,242,0.32)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff8f2",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
  gap: 16,
};

const galleryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
  gap: 16,
};
