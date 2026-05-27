"use client";

import { useState, useEffect } from "react";
import { AD_TEMPLATES, getTemplateConfig } from "@/lib/adTemplates";
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

export default function Step1Product({ onNext, loading, initial }: Props) {
  const initialDuration = initial?.duration ?? 15;
  const [productName, setProductName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [audience, setAudience] = useState(
    initial?.targetAudience ?? "Femmes 18-35 ans"
  );
  const [goal, setGoal] = useState(initial?.adGoal ?? "Ventes directes");
  const [template, setTemplate] = useState<AdTemplate>(
    initial?.template ?? "living_product"
  );
  const [nScenes, setNScenes] = useState(
    initial?.nScenes ?? 3
  );
  const [duration, setDuration] = useState(initialDuration);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [mimeTypes, setMimeTypes] = useState<string[]>(
    initial?.imagesMimeType ?? []
  );
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (initial?.images?.length) {
      setPreviews(
        initial.images.map(
          (data, i) =>
            `data:${initial.imagesMimeType?.[i] || "image/jpeg"};base64,${data}`
        )
      );
    }
  }, [initial]);

  const selectTemplate = (id: AdTemplate) => {
    setTemplate(id);
    setNScenes(getTemplateConfig(id).scenes);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files.slice(0, 5 - images.length)) {
      try {
        const dataUrl = await fileToBase64(file);
        const data = dataUrl.split(",")[1];
        const mime = file.type || "image/jpeg";
        setImages((prev) => [...prev, data]);
        setMimeTypes((prev) => [...prev, mime]);
        setPreviews((prev) => [...prev, dataUrl]);
      } catch {
        // Ignore a failed file and let the user retry.
      }
    }
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setMimeTypes((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const canContinue =
    productName.trim() && description.trim() && images.length > 0;

  const submit = () => {
    if (!canContinue || loading) return;
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
            <div className="step-sub">Jusqu&apos;à 5 photos · fond blanc recommandé</div>
          </div>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            border: "1.5px dashed var(--border)",
            borderRadius: 14,
            padding: "28px 16px",
            cursor: "pointer",
            background: "var(--bg3)",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 26 }}>📸</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Déposer les photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageUpload}
            disabled={images.length >= 5}
          />
        </label>

        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {previews.map((p, i) => (
              <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
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
        )}
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
              gridTemplateColumns: "1fr 1fr",
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
                    nScenes === n ? "rgba(245,182,67,0.45)" : "var(--border)"
                  }`,
                  background:
                    nScenes === n ? "rgba(245,182,67,0.1)" : "var(--bg2)",
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
                onClick={() => {
                  setDuration(d.s);
                  const auto = d.s <= 15 ? 1 : d.s <= 30 ? 2 : 3;
                  setNScenes(auto);
                }}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 12,
                  border: `1px solid ${
                    duration === d.s
                      ? "rgba(245,182,67,0.45)"
                      : "var(--border)"
                  }`,
                  background:
                    duration === d.s
                      ? "rgba(245,182,67,0.1)"
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
        borderColor: active ? "rgba(245,182,67,0.4)" : undefined,
        color: active ? "var(--accent-warm)" : undefined,
      }}
    >
      {children}
    </button>
  );
}
