"use client";

import { useState } from "react";
import type { AdScript, ProductInput } from "@/types/ad";

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

  const hasAllImages = script.scenes.every((scene) => images[`scene_${scene.number}`]);

  const generateAndAssemble = async () => {
    setStep("animating");
    setError("");
    setProgress(0);
    setProgressLabel("");
    setFinalVideo(null);
    setSavedOk(false);

    const sceneVideos: Record<
      number,
      { videoUrl?: string | null; videoBase64?: string | null }
    > = {};
    const sceneAudios: Record<number, AudioAsset> = {};
    const total = script.scenes.length;

    for (let i = 0; i < total; i++) {
      const sc = script.scenes[i] as ScenePromptFallbacks;
      const pct = Math.max(5, Math.round((i / total) * 70));
      setProgress(pct);
      setProgressLabel(`Scène ${sc.number}/${total} — Vidéo + Voix...`);

      const imgData = extractBase64(images[`scene_${sc.number}`] || "");
      const [videoRes, audioRes] = await Promise.allSettled([
        fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt:
              sc.grok_video_prompt ||
              sc.video_prompt ||
              sc.grok_prompt ||
              sc.animation_prompt ||
              `Pixar 3D animated commercial vertical 9:16. ${
                sc.visual_description || sc.title
              }. ${sc.character_action || ""}. Cinematic lighting.`,
            imageUrl: images[`scene_${sc.number}`] || null,
            imageBase64: imgData?.base64 || null,
          }),
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Video error");
          return data;
        }),
        fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sc.voiceover || sc.visual_description || sc.title || "",
            emotion: sc.subtitle || "",
            productCategory: product.template,
            gender: /hommes?/i.test(product.targetAudience) ? "male" : undefined,
          }),
        }).then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Voice error");
          return data;
        }),
      ]);

      if (
        videoRes.status === "fulfilled" &&
        (videoRes.value?.videoUrl || videoRes.value?.videoBase64)
      ) {
        sceneVideos[sc.number] = {
          videoUrl: videoRes.value.videoUrl || null,
          videoBase64: videoRes.value.videoBase64 || null,
        };
        console.log(`✅ Scène ${sc.number}: vidéo OK`);
      } else {
        const videoError =
          videoRes.status === "rejected"
            ? videoRes.reason instanceof Error
              ? videoRes.reason.message
              : String(videoRes.reason)
            : "Erreur vidéo inconnue";
        console.warn(
          `⚠️ Scène ${sc.number}: vidéo échouée`,
          videoRes.status === "rejected" ? videoRes.reason : videoRes.value
        );
        setError(videoError);
        setStep("error");
        return;
      }

      if (audioRes.status === "fulfilled" && audioRes.value?.audioBase64) {
        sceneAudios[sc.number] = {
          base64: audioRes.value.audioBase64,
          mimeType: audioRes.value.mimeType || "audio/wav",
        };
        console.log(`✅ Scène ${sc.number}: audio OK`);
      } else {
        console.warn(
          `⚠️ Scène ${sc.number}: audio échoué (vidéo muette)`,
          audioRes.status === "rejected" ? audioRes.reason : ""
        );
      }
    }

    if (Object.keys(sceneVideos).length === 0) {
      setError(
        "Aucune vidéo générée — vérifie GROK_API_KEY dans .env.local et la console (F12)"
      );
      setStep("error");
      return;
    }

    setAudios(sceneAudios);
    setStep("assembling");
    setProgress(80);
    setProgressLabel("Assemblage vidéo + audio...");

    const scenesData = script.scenes
      .filter((sc) => sceneVideos[sc.number])
      .map((sc) => ({
        videoUrl: sceneVideos[sc.number]?.videoUrl || null,
        videoBase64: sceneVideos[sc.number]?.videoBase64 || null,
        audioBase64: sceneAudios[sc.number]?.base64 || null,
        audioMimeType: sceneAudios[sc.number]?.mimeType || "audio/wav",
      }));

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
      const scenesData = script.scenes.map((scene) => ({
        number: scene.number,
        title: scene.title,
        subtitle: scene.subtitle,
        voiceover: scene.voiceover,
        imageUrl: images[`scene_${scene.number}`] || null,
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
          Grok Aurora anime les {script.scenes.length} scènes puis elles sont
          assemblées en une seule vidéo MP4.
        </p>
        {!hasAllImages && (
          <p style={{ fontSize: 12, color: "#F87171", marginBottom: 16 }}>
            Certaines scènes n&apos;ont pas d&apos;image. Retourne à l&apos;étape
            Visuels pour les générer.
          </p>
        )}
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 32 }}>
          Durée cible : {product.duration}s · {script.scenes.length} scène
          {script.scenes.length > 1 ? "s" : ""} de ~
          {Math.round(product.duration / script.scenes.length)}s chacune
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
          {script.scenes.map((scene) => (
            <div
              key={scene.number}
              style={{
                width: 70,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border)",
                opacity: images[`scene_${scene.number}`] ? 1 : 0.3,
              }}
            >
              {images[`scene_${scene.number}`] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[`scene_${scene.number}`]}
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

        <button
          type="button"
          onClick={generateAndAssemble}
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
