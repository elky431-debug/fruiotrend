"use client";

import { useMemo, useState } from "react";
import { getActiveScenes } from "@/lib/adScenes";
import {
  buildLtxVoiceStyleHint,
  resolveVoiceDemoCategory,
} from "@/lib/voices";
import type { AdScript, ProductInput } from "@/types/ad";
import VoiceSelector from "./VoiceSelector";

interface Props {
  product: ProductInput;
  script: AdScript;
  images: Record<string, string>;
  onSaved: () => void;
  videos?: Record<string, string>;
  onVideoGenerated?: (id: string, url: string) => void;
}

type AudioAsset = {
  base64: string;
  mimeType: string;
};

function extractBase64(url: string) {
  if (!url?.startsWith("data:")) return null;
  const [meta, data] = url.split(",");
  return {
    base64: data,
    mimeType: meta.match(/:(.*?);/)?.[1] || "image/jpeg",
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Conversion blob échouée"));
    };
    reader.onerror = () => reject(reader.error || new Error("Lecture blob échouée"));
    reader.readAsDataURL(blob);
  });
}

const EXPECTED_MS = 55_000; // LTX 2.3 Fast sync ~30–90s

/** Réduit l'image avant envoi (upload + inférence plus rapides) */
async function compressImageForVideo(
  dataUrl: string,
  maxWidth = 720
): Promise<{ imageUrl: string; imageBase64: string | null }> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) {
    return { imageUrl: dataUrl, imageBase64: null };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ imageUrl: dataUrl, imageBase64: null });
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      const b64 = compressed.includes(",") ? compressed.split(",")[1] : null;
      resolve({ imageUrl: compressed, imageBase64: b64 });
    };
    img.onerror = () => resolve({ imageUrl: dataUrl, imageBase64: null });
    img.src = dataUrl;
  });
}

async function generateSceneVideoFast(
  sc: ScenePromptFallbacks,
  imageUrl: string | null,
  imageBase64: string | null,
  durationSeconds?: number,
  audioOpts?: { voiceover: string; voiceStyle: string; template?: string },
  callbacks?: {
    onStart?: () => void;
    onPoll?: (progressPct: number) => void;
  }
): Promise<{ videoUrl?: string | null; videoBase64?: string | null }> {
  const basePrompt =
    sc.grok_video_prompt ||
    sc.video_prompt ||
    sc.grok_prompt ||
    sc.animation_prompt ||
    `Pixar 3D product ad, smooth camera, 9:16. ${sc.visual_description || sc.title}. ${
      sc.character_action || ""
    }`;

  callbacks?.onStart?.();

  const started = Date.now();
  const tick = window.setInterval(() => {
    const pct = Math.min(92, Math.round(((Date.now() - started) / EXPECTED_MS) * 92));
    callbacks?.onPoll?.(pct);
  }, 400);

  try {
    const res = await fetch("/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        imageBase64,
        prompt: basePrompt,
        durationSeconds: durationSeconds || sc.duration_seconds,
        mouthExpression: sc.mouth_expression,
        voiceover: audioOpts?.voiceover,
        voiceStyle: audioOpts?.voiceStyle,
        template: audioOpts?.template,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || "Échec génération vidéo");
    }

    callbacks?.onPoll?.(100);
    console.log("[STEP4] Vidéo OK en", data.durationMs || Date.now() - started, "ms");
    return { videoUrl: data.videoUrl as string, videoBase64: null };
  } finally {
    window.clearInterval(tick);
  }
}

type Step = "idle" | "animating" | "assembling" | "done" | "error";
type ScenePromptFallbacks = AdScript["scenes"][number] & {
  video_prompt?: string;
  grok_prompt?: string;
  animation_prompt?: string;
};

export default function Step4Video({
  product,
  script,
  images,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [audios, setAudios] = useState<Record<number, AudioAsset>>({});
  const [selectedVoice, setSelectedVoice] = useState("eve");

  const scenes = useMemo(
    () => getActiveScenes(product, script),
    [product, script]
  );
  const sceneImageId = (index: number) => `scene_${index + 1}`;

  const hasAllImages = scenes.every((_, i) => images[sceneImageId(i)]);
  const voiceDemoCategory = resolveVoiceDemoCategory(product);

  const generateAndAssemble = async (voiceName: string) => {
    setStep("animating");
    setError("");
    setProgress(0);
    setProgressLabel("");
    setFinalVideo(null);
    setSavedOk(false);

    const sceneVideos: Record<
      number,
      {
        videoUrl?: string | null;
        videoBase64?: string | null;
        embeddedAudio?: boolean;
        fallbackVideoUrl?: string | null;
      }
    > = {};
    const total = scenes.length;
    const voiceStyle = buildLtxVoiceStyleHint(voiceName);

    for (let i = 0; i < total; i++) {
      const sc = scenes[i] as ScenePromptFallbacks;
      const basePct = Math.round((i / total) * 70);
      setProgress(Math.max(5, basePct + 2));

      const rawImage = images[sceneImageId(i)] || "";
      const compressed = await compressImageForVideo(rawImage);
      const imgData = compressed.imageBase64
        ? { base64: compressed.imageBase64, mimeType: "image/jpeg" }
        : extractBase64(compressed.imageUrl);

      if (!sc.voiceover?.trim()) {
        setError(`Voiceover manquant pour la scène ${sc.number}. Régénère le script.`);
        setStep("error");
        return;
      }

      setProgressLabel(
        `Scène ${sc.number}/${total} — LTX (vidéo + voix intégrées)...`
      );

      try {
        const video = await generateSceneVideoFast(
          sc,
          compressed.imageUrl,
          imgData?.base64 || null,
          sc.duration_seconds,
          {
            voiceover: sc.voiceover.trim(),
            voiceStyle,
            template: product.template,
          },
          {
            onStart: () => {
              setProgressLabel(
                `Scène ${sc.number}/${total} — LTX 2.3 Fast + audio...`
              );
            },
            onPoll: (videoPct) => {
              const overall = Math.min(
                68,
                basePct + Math.round((videoPct / 100) * (68 - basePct))
              );
              setProgress(overall);
              setProgressLabel(
                `Scène ${sc.number}/${total} — ${Math.round(videoPct)}%`
              );
            },
          }
        );

        if (!video.videoUrl) {
          setError(`Vidéo manquante pour la scène ${sc.number}`);
          setStep("error");
          return;
        }

        sceneVideos[sc.number] = {
          videoUrl: video.videoUrl,
          fallbackVideoUrl: video.videoUrl,
          videoBase64: null,
          embeddedAudio: true,
        };

        setProgress(Math.round(((i + 1) / total) * 70));
        console.log(`✅ Scène ${sc.number}: LTX vidéo + voix OK`);
      } catch (videoError) {
        setError(
          videoError instanceof Error
            ? videoError.message
            : "Erreur génération vidéo"
        );
        setStep("error");
        return;
      }
    }

    if (Object.keys(sceneVideos).length === 0) {
      setError(
        "Aucune vidéo générée — vérifie FAL_API_KEY dans .env.local et la console (F12)"
      );
      setStep("error");
      return;
    }

    setStep("assembling");
    setProgress(80);
    setProgressLabel("Assemblage des scènes...");

    const scenesData = scenes
      .filter((sc) => sceneVideos[sc.number])
      .map((sc) => {
        const sv = sceneVideos[sc.number];
        const embedded = sv?.embeddedAudio === true;
        return {
          videoUrl: sv?.videoUrl || null,
          fallbackVideoUrl: sv?.fallbackVideoUrl || null,
          videoBase64: sv?.videoBase64 || null,
          embeddedAudio: embedded,
          audioBase64: null,
          audioMimeType: "audio/mp3",
        };
      });

    try {
      setProgress(90);
      const res = await fetch("/api/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: scenesData }),
      });

      if (!res.ok)
        throw new Error((await res.json()).error || "Erreur assemblage");
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      setFinalVideo(dataUrl);
      setStep("done");
      setProgress(100);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur assemblage");
      setStep("error");
    }
  };

  const saveToDashboard = async () => {
    if (!finalVideo) return;

    setSaving(true);
    try {
      const scenesData = scenes.map((scene, i) => ({
        number: scene.number,
        title: scene.title,
        subtitle: scene.subtitle,
        voiceover: scene.voiceover,
        imageUrl: images[sceneImageId(i)] || null,
        videoUrl: null,
        audioUrl: audios[scene.number]
          ? `data:${audios[scene.number].mimeType};base64,${audios[scene.number].base64}`
          : null,
      }));

      const res = await fetch("/api/ads/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: script.title,
          hook: script.hook,
          cta: script.cta,
          productName: product.name,
          template: product.template,
          script,
          scenes: scenesData,
          finalVideoUrl: finalVideo,
          productImages: product.images,
          productImagesMimeType: product.imagesMimeType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la sauvegarde");
      }

      setSavedOk(true);
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (step === "idle") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          Générer la vidéo finale
        </h2>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
          LTX 2.3 Fast (vidéo + voix intégrées) — {scenes.length === 1 ? "ton image" : `les ${scenes.length} scènes`}{" "}
          (~1–2 min par scène). Style vocal Grok : aperçu ci-dessous.
        </p>
        {!hasAllImages && (
          <p style={{ fontSize: 12, color: "#F87171", marginBottom: 16 }}>
            Certaines scènes n&apos;ont pas d&apos;image. Retourne à l&apos;étape
            Visuels pour les générer.
          </p>
        )}
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 32 }}>
          Durée cible : {product.duration}s · {scenes.length} scène
          {scenes.length > 1 ? "s" : ""} de ~
          {Math.round(product.duration / scenes.length)}s chacune
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 32,
          }}
        >
          {scenes.map((scene, i) => (
            <div
              key={scene.number}
              style={{
                width: 70,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border)",
                opacity: images[sceneImageId(i)] ? 1 : 0.3,
              }}
            >
              {images[sceneImageId(i)] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[sceneImageId(i)]}
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio: "9/16",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: "9/16",
                    background: "var(--bg3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  🖼
                </div>
              )}
              <div
                style={{
                  padding: "4px 6px",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--text2)",
                  textAlign: "center",
                }}
              >
                {scene.subtitle?.slice(0, 10) || `Scène ${scene.number}`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto 24px", textAlign: "left" }}>
          <VoiceSelector
            selectedVoice={selectedVoice}
            onSelect={setSelectedVoice}
            productCategory={voiceDemoCategory}
          />
        </div>

        <button
          type="button"
          onClick={() => generateAndAssemble(selectedVoice)}
          disabled={!hasAllImages}
          style={{
            padding: "14px 32px",
            borderRadius: 14,
            border: "none",
            background: hasAllImages
              ? "linear-gradient(135deg,#FF6B35,#FF3D6B)"
              : "var(--bg3)",
            color: hasAllImages ? "#fff" : "var(--text3)",
            fontSize: 15,
            fontWeight: 700,
            cursor: hasAllImages ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
          }}
        >
          🎬 Générer la vidéo finale
        </button>
      </div>
    );
  }

  if (step === "animating" || step === "assembling") {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            height: 6,
            background: "var(--bg3)",
            borderRadius: 99,
            margin: "0 auto 16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: "linear-gradient(90deg, #FF6B35, var(--accent))",
              width: `${progress}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        <div style={{ fontSize: 32, marginBottom: 12 }}>
          {step === "animating" ? "✨" : "🎞️"}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          {step === "animating" ? "Animation en cours" : "Assemblage final"}
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>
          {progressLabel}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          {progress}% · Ne ferme pas cette page
        </div>
        {error && (
          <div
            style={{
              background: "#2a0a0a",
              border: "1px solid #ff4444",
              borderRadius: 12,
              padding: "16px 20px",
              color: "#ff6666",
              marginTop: 16,
              fontSize: 14,
            }}
          >
            ❌ {error}
          </div>
        )}
      </div>
    );
  }

  if (step === "error") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#F87171",
            marginBottom: 8,
          }}
        >
          Erreur de génération
        </div>
        <div
          style={{
            background: "#2a0a0a",
            border: "1px solid #ff4444",
            borderRadius: 12,
            padding: "16px 20px",
            color: "#ff6666",
            margin: "0 auto 24px",
            maxWidth: 460,
            fontSize: 14,
          }}
        >
          ❌ {error}
        </div>
        <button
          type="button"
          onClick={() => setStep("idle")}
          style={{
            padding: "11px 24px",
            borderRadius: 12,
            border: "none",
            background: "var(--accent)",
            color: "#000",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "20px 0",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e" }}>
        ✅ Ta pub est prête !
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 320,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        <video
          src={finalVideo || undefined}
          controls
          autoPlay
          loop
          playsInline
          style={{ width: "100%", display: "block" }}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          {script.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", fontStyle: "italic" }}>
          &quot;{script.hook}&quot;
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <a
          href={finalVideo || "#"}
          download={`${script.title.replace(/\s+/g, "_")}.mp4`}
          style={{
            padding: "12px 28px",
            borderRadius: 12,
            background: "var(--accent)",
            color: "#000",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          ↓ Télécharger MP4
        </a>

        <button
          type="button"
          onClick={saveToDashboard}
          disabled={saving || savedOk}
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: savedOk ? "#22c55e" : "var(--bg2)",
            color: savedOk ? "#fff" : "var(--text2)",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving || savedOk ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {savedOk ? "✓ Sauvegardée" : saving ? "..." : "💾 Sauvegarder dans Mes pubs"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("idle");
            setFinalVideo(null);
            setProgress(0);
            setProgressLabel("");
            setError("");
            setSavedOk(false);
          }}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg2)",
            color: "var(--text2)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          🔄 Régénérer
        </button>
      </div>
    </div>
  );
}
