"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { listAnimateThemes, type AnimateTheme } from "@/lib/animateThemes";
import { CREDIT_COSTS } from "@/lib/plans";
import {
  IconImage,
  IconSparkles,
  IconFilm,
  IconTrash,
  IconDownload,
  IconAlertTriangle,
  IconCheckCircle,
  IconLayers,
  IconBolt,
} from "@/components/icons";

const MAX_IMAGES = 10;
const DURATIONS = [6, 8, 10] as const;
const THEMES = listAnimateThemes();

type ClipStatus = "idle" | "queued" | "generating" | "done" | "error";

type Clip = {
  id: string;
  name: string;
  dataUrl: string;
  status: ClipStatus;
  progress: number;
  videoUrl?: string;
  error?: string;
};

let uid = 0;
const nextId = () => `clip-${Date.now()}-${uid++}`;

/** Compresse l'image (canvas) avant envoi : upload + inférence plus rapides. */
function compressImage(file: File, maxWidth = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier échouée"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function animateOne(
  clip: Clip,
  themeId: string,
  durationSeconds: number,
  userPrompt: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const imageBase64 = clip.dataUrl.includes(",")
    ? clip.dataUrl.split(",")[1]
    : "";

  const startRes = await authFetch("/api/animate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl: clip.dataUrl,
      imageBase64,
      mimeType: "image/jpeg",
      themeId,
      durationSeconds,
      userPrompt,
    }),
  });

  const startData = await startRes.json().catch(() => ({}));
  if (startRes.status === 402) {
    window.dispatchEvent(new Event("credits-updated"));
    throw new Error(startData.error || "Crédits insuffisants");
  }
  if (!startRes.ok || startData.error || !startData.requestId) {
    throw new Error(startData.error || "Échec du démarrage de l'animation");
  }
  window.dispatchEvent(new Event("credits-updated"));

  const requestId = startData.requestId as string;
  const statusUrl =
    typeof startData.statusUrl === "string" ? startData.statusUrl : null;

  for (let attempt = 0; attempt < 120; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
    onProgress(Math.min(92, 8 + attempt * 2));

    let statusData: { status?: string; videoUrl?: string; error?: string } = {};
    try {
      const q = statusUrl ? `&statusUrl=${encodeURIComponent(statusUrl)}` : "";
      const res = await authFetch(
        `/api/video/status?requestId=${encodeURIComponent(requestId)}${q}`
      );
      statusData = await res.json().catch(() => ({}));
    } catch {
      continue;
    }

    const status = (statusData.status || "").toUpperCase();
    if (status === "COMPLETED" && statusData.videoUrl) {
      onProgress(100);
      return statusData.videoUrl;
    }
    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
      throw new Error(statusData.error || "Génération échouée");
    }
  }
  throw new Error("La génération a expiré. Réessaie.");
}

/** Exécute des tâches par lots (concurrence limitée). */
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item === undefined) break;
        await worker(item);
      }
    }
  );
  await Promise.all(runners);
}

export default function AnimatePage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [themeId, setThemeId] = useState<AnimateTheme["id"]>(THEMES[0].id);
  const [duration, setDuration] = useState<number>(6);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creditCost = clips.length * CREDIT_COSTS.video;
  const doneClips = clips.filter((c) => c.status === "done" && c.videoUrl);
  const allSettled =
    clips.length > 0 &&
    clips.every((c) => c.status === "done" || c.status === "error");

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setGlobalError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;

    const compressed = await Promise.all(
      list.map(async (f) => {
        try {
          return {
            id: nextId(),
            name: f.name,
            dataUrl: await compressImage(f),
            status: "idle" as ClipStatus,
            progress: 0,
          };
        } catch {
          return null;
        }
      })
    );

    setClips((prev) => {
      const additions = compressed.filter((c): c is Clip => c !== null);
      const merged = [...prev, ...additions];
      if (merged.length > MAX_IMAGES) {
        setGlobalError(`Maximum ${MAX_IMAGES} images.`);
      }
      return merged.slice(0, MAX_IMAGES);
    });
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  const assemble = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    // Un seul clip réussi : c'est déjà la vidéo finale.
    if (urls.length === 1) {
      setFinalVideo(urls[0]);
      return;
    }
    setAssembling(true);
    setGlobalError(null);
    try {
      const res = await authFetch("/api/video/concat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipUrls: urls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error || !data.videoUrl) {
        throw new Error(data.error || "Assemblage échoué");
      }
      setFinalVideo(data.videoUrl);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Assemblage de la vidéo finale échoué"
      );
    } finally {
      setAssembling(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!clips.length || running) return;
    setRunning(true);
    setGlobalError(null);
    setFinalVideo(null);

    setClips((prev) =>
      prev.map((c) => ({
        ...c,
        status: "queued",
        progress: 0,
        videoUrl: undefined,
        error: undefined,
      }))
    );

    const snapshot = clips.map((c) => ({ ...c }));
    const results = new Map<string, string>();
    let creditsExhausted = false;

    await runPool(snapshot, 2, async (clip) => {
      if (creditsExhausted) {
        updateClip(clip.id, { status: "error", error: "Annulé" });
        return;
      }
      updateClip(clip.id, { status: "generating", progress: 5 });
      try {
        const videoUrl = await animateOne(
          clip,
          themeId,
          duration,
          prompt,
          (pct) => updateClip(clip.id, { progress: pct })
        );
        results.set(clip.id, videoUrl);
        updateClip(clip.id, { status: "done", progress: 100, videoUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        if (msg.toLowerCase().includes("crédit")) creditsExhausted = true;
        updateClip(clip.id, { status: "error", error: msg });
      }
    });

    setRunning(false);

    // Assemblage automatique en une seule vidéo (ordre d'upload conservé).
    const orderedUrls = snapshot
      .map((c) => results.get(c.id))
      .filter((u): u is string => Boolean(u));
    if (orderedUrls.length > 0) {
      await assemble(orderedUrls);
    }
  }, [clips, running, themeId, duration, prompt, updateClip, assemble]);

  const handleAssembleManual = useCallback(() => {
    const urls = clips
      .filter((c) => c.status === "done" && c.videoUrl)
      .map((c) => c.videoUrl as string);
    void assemble(urls);
  }, [clips, assemble]);

  const activeTheme = useMemo(
    () => THEMES.find((t) => t.id === themeId) ?? THEMES[0],
    [themeId]
  );

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 20px 80px" }}>
      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 999,
            background: "rgba(227,43,69,0.12)",
            border: "1px solid rgba(227,43,69,0.28)",
            color: "var(--accent-soft, #ff8fa3)",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          <IconSparkles size={14} /> Nouveau · Animation IA
        </div>
        <h1
          style={{
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          Anime tes images
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 15, margin: 0, maxWidth: 620 }}>
          Dépose jusqu&apos;à {MAX_IMAGES} images, décris ce que tu veux, choisis
          un thème. L&apos;IA analyse et anime chaque image de façon logique, puis
          assemble automatiquement le tout en une seule vidéo.
        </p>
      </header>

      {/* Étape 1 — Upload */}
      <Section
        step={1}
        title="Tes images"
        hint={`${clips.length}/${MAX_IMAGES}`}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent, #E8313A)" : "var(--border)"}`,
            borderRadius: 18,
            padding: "34px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "rgba(227,43,69,0.06)" : "var(--bg2, rgba(255,255,255,0.02))",
            transition: "border-color .15s, background .15s",
            marginBottom: clips.length ? 20 : 0,
          }}
        >
          <div style={{ color: "var(--text2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <IconImage size={28} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              Glisse tes images ici ou clique pour parcourir
            </div>
            <div style={{ fontSize: 13 }}>JPG, PNG, WEBP · jusqu&apos;à {MAX_IMAGES}</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {clips.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 12,
            }}
          >
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onRemove={removeClip} running={running} />
            ))}
          </div>
        )}
      </Section>

      {/* Étape 2 — Prompt */}
      <Section step={2} title="Ta demande" hint="optionnel">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris précisément ce que tu veux : ambiance, mouvement, action… Ex. « zoom lent sur l'écran, ambiance premium, la lumière balaye le produit ». Appliqué à toutes les images."
          rows={3}
          maxLength={500}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "14px 16px",
            borderRadius: 14,
            background: "var(--bg3, rgba(255,255,255,0.04))",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "inherit",
            lineHeight: 1.5,
            outline: "none",
          }}
        />
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text2)", textAlign: "right" }}>
          {prompt.length}/500
        </div>
      </Section>

      {/* Étape 3 — Thème */}
      <Section step={3} title="Thème d'animation">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {THEMES.map((t) => {
            const active = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                style={{
                  textAlign: "left",
                  padding: "16px",
                  borderRadius: 16,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: active ? "rgba(227,43,69,0.12)" : "var(--bg3, rgba(255,255,255,0.04))",
                  border: `1.5px solid ${active ? "var(--accent, #E8313A)" : "var(--border)"}`,
                  transition: "border-color .15s, background .15s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{t.emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.4 }}>
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Étape 4 — Durée */}
      <Section step={4} title="Durée par image">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {DURATIONS.map((d) => {
            const active = d === duration;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  color: active ? "#fff" : "var(--text2)",
                  background: active
                    ? "linear-gradient(135deg, var(--accent, #E8313A), var(--accent-cherry, #e32b45))"
                    : "var(--bg3, rgba(255,255,255,0.04))",
                  border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                }}
              >
                {d}s
              </button>
            );
          })}
        </div>
      </Section>

      {globalError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(232,49,58,0.1)",
            border: "1px solid rgba(232,49,58,0.3)",
            color: "#ff8fa3",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          <IconAlertTriangle size={16} /> {globalError}
        </div>
      )}

      {/* Action principale */}
      <div
        style={{
          position: "sticky",
          bottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "16px 20px",
          borderRadius: 18,
          background: "rgba(10,8,6,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text2)", fontSize: 13 }}>
          <span style={{ color: "var(--text)", fontWeight: 700 }}>{activeTheme.emoji} {activeTheme.name}</span>
          {clips.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              · <IconBolt size={13} /> {creditCost} crédits ({clips.length} × {CREDIT_COSTS.video})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={running || clips.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 26px",
            borderRadius: 14,
            border: "none",
            cursor: running || clips.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 15,
            fontWeight: 800,
            color: "#fff",
            opacity: running || clips.length === 0 ? 0.6 : 1,
            background: "linear-gradient(135deg, var(--accent, #E8313A), var(--accent-cherry, #e32b45))",
            boxShadow: "0 6px 22px rgba(227,43,69,0.35)",
          }}
        >
          <IconFilm size={17} />
          {running ? "Animation en cours…" : `Animer ${clips.length || ""} image${clips.length > 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Résultat — vidéo unique */}
      {allSettled && doneClips.length > 0 && (
        <Section step={5} title="Ta vidéo">
          {assembling && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 18px",
                borderRadius: 14,
                background: "var(--bg3, rgba(255,255,255,0.04))",
                border: "1px solid var(--border)",
                color: "var(--text2)",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(232,49,58,0.3)",
                  borderTopColor: "#E8313A",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Assemblage de ta vidéo finale…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {finalVideo && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7ee787", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                <IconCheckCircle size={15} />
                {doneClips.length > 1
                  ? `Vidéo finale (${doneClips.length} images assemblées)`
                  : "Vidéo finale"}
              </div>
              <video
                src={finalVideo}
                controls
                autoPlay
                loop
                playsInline
                style={{ width: "100%", maxWidth: 320, borderRadius: 18, border: "1px solid var(--border)" }}
              />
              <div style={{ marginTop: 12 }}>
                <a
                  href={finalVideo}
                  download="pubmoi-animation.mp4"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "12px 22px",
                    borderRadius: 12,
                    textDecoration: "none",
                    background: "linear-gradient(135deg, var(--accent, #E8313A), var(--accent-cherry, #e32b45))",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                    boxShadow: "0 6px 22px rgba(227,43,69,0.35)",
                  }}
                >
                  <IconDownload size={15} /> Télécharger la vidéo
                </a>
              </div>
            </div>
          )}

          {!finalVideo && !assembling && doneClips.length > 1 && (
            <button
              type="button"
              onClick={handleAssembleManual}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid var(--border2, rgba(255,255,255,0.16))",
                background: "var(--bg3, rgba(255,255,255,0.05))",
                color: "var(--text)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              <IconLayers size={16} /> Réessayer l&apos;assemblage
            </button>
          )}

          {/* Clips individuels (secondaire) */}
          {doneClips.length > 1 && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text2)", fontWeight: 600, marginBottom: 12 }}>
                Voir les clips individuels ({doneClips.length})
              </summary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 14,
                  marginTop: 12,
                }}
              >
                {doneClips.map((clip, i) => (
                  <div key={clip.id}>
                    <video
                      src={clip.videoUrl}
                      controls
                      playsInline
                      style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
                    />
                    <a
                      href={clip.videoUrl}
                      download={`clip-${i + 1}.mp4`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                        fontSize: 12.5,
                        color: "var(--text2)",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <IconDownload size={13} /> Clip {i + 1}
                    </a>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg3, rgba(255,255,255,0.06))",
            border: "1px solid var(--border)",
            fontSize: 13,
            fontWeight: 800,
            color: "var(--text2)",
          }}
        >
          {step}
        </span>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
        {hint && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text2)", fontWeight: 600 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ClipCard({
  clip,
  onRemove,
  running,
}: {
  clip: Clip;
  onRemove: (id: string) => void;
  running: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
        aspectRatio: "9 / 12",
        background: "#000",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clip.dataUrl}
        alt={clip.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: clip.status === "generating" ? 0.5 : 1 }}
      />

      {!running && clip.status !== "generating" && (
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          aria-label="Retirer"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconTrash size={13} />
        </button>
      )}

      {(clip.status === "generating" || clip.status === "queued") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800 }}>{clip.progress}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            {clip.status === "queued" ? "En file…" : "Animation…"}
          </div>
        </div>
      )}

      {clip.status === "done" && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(20,120,60,0.9)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconCheckCircle size={14} />
        </div>
      )}

      {clip.status === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(120,20,30,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            textAlign: "center",
            color: "#fff",
            fontSize: 11,
          }}
          title={clip.error}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconAlertTriangle size={12} /> Échec
          </span>
        </div>
      )}
    </div>
  );
}
