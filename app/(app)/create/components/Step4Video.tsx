"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { VOICE_OPTIONS } from "@/lib/voices";
import { getActiveScenes } from "@/lib/adScenes";
import { CREDIT_COSTS, videoStepCreditTotal } from "@/lib/plans";
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

/** LTX plafonne à 20s/clip — on segmente les scènes plus longues. */
const LTX_MAX_CLIP_SECONDS = 20;
const LTX_SEGMENT_SECONDS = 15;

function planSegmentDurations(totalSeconds: number): number[] {
  const total = Math.max(1, Math.round(totalSeconds || 1));
  if (total <= LTX_MAX_CLIP_SECONDS) return [total];
  const count = Math.ceil(total / LTX_SEGMENT_SECONDS);
  const per = Math.ceil(total / count);
  return Array.from({ length: count }, () => Math.min(LTX_MAX_CLIP_SECONDS, per));
}

/**
 * Génération vidéo en mode "queue" (asynchrone) : on démarre le job côté fal
 * via /api/video/start (retour immédiat) puis on interroge /api/video/status
 * par petits appels courts. Indispensable en production : les fonctions
 * serverless (Netlify) coupent à ~26s, alors qu'une génération LTX prend
 * 30–90s. L'ancien appel synchrone /api/video/generate dépassait ce délai et
 * renvoyait "génération échouée".
 */
async function generateOneClip(
  basePrompt: string,
  imageUrl: string | null,
  imageBase64: string | null,
  durationSeconds: number,
  sc: ScenePromptFallbacks,
  audioOpts?: { voiceover: string; voiceStyle: string; template?: string },
  segmentExtra = false
): Promise<string> {
  const startRes = await authFetch("/api/video/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      imageBase64,
      prompt: basePrompt,
      durationSeconds,
      mouthExpression: sc.mouth_expression,
      voiceover: audioOpts?.voiceover,
      voiceStyle: audioOpts?.voiceStyle,
      template: audioOpts?.template,
      segmentExtra,
    }),
  });

  const startData = await startRes.json().catch(() => ({}));
  if (startRes.status === 402) {
    window.dispatchEvent(new Event("credits-updated"));
    throw new Error(
      startData.error ||
        `Crédits insuffisants (${startData.required} requis, ${startData.remaining} restants)`
    );
  }
  if (!startRes.ok || startData.error || !startData.requestId) {
    throw new Error(startData.error || "Échec démarrage génération vidéo");
  }
  window.dispatchEvent(new Event("credits-updated"));

  const requestId = startData.requestId as string;

  // Polling : ~4 min max (80 essais × 3s). Chaque appel est court → compatible
  // serverless.
  for (let attempt = 0; attempt < 80; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));

    let statusData: {
      status?: string;
      videoUrl?: string;
      error?: string;
    } = {};
    try {
      const statusRes = await authFetch(
        `/api/video/status?requestId=${encodeURIComponent(requestId)}`
      );
      statusData = await statusRes.json().catch(() => ({}));
    } catch {
      // Erreur réseau ponctuelle → on retente au prochain tour.
      continue;
    }

    const status = (statusData.status || "").toUpperCase();
    if (status === "COMPLETED" && statusData.videoUrl) {
      return statusData.videoUrl;
    }
    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
      throw new Error(statusData.error || "Génération vidéo échouée");
    }
  }

  throw new Error("La génération vidéo a expiré. Réessaie dans un instant.");
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
    `Pixar 3D product ad, static camera, 9:16. ${sc.visual_description || sc.title}. ${
      sc.character_action || ""
    }`;

  callbacks?.onStart?.();

  const targetDuration = durationSeconds || sc.duration_seconds || 15;
  const segments = planSegmentDurations(targetDuration);

  const started = Date.now();
  // On allonge la barre de progression proportionnellement au nombre de segments.
  const expectedTotal = EXPECTED_MS * segments.length;
  const tick = window.setInterval(() => {
    const pct = Math.min(
      92,
      Math.round(((Date.now() - started) / expectedTotal) * 92)
    );
    callbacks?.onPoll?.(pct);
  }, 400);

  try {
    const clipUrls: string[] = [];
    for (let s = 0; s < segments.length; s++) {
      const url = await generateOneClip(
        basePrompt,
        imageUrl,
        imageBase64,
        segments[s],
        sc,
        audioOpts,
        s > 0 // segments suivants : ne débiter que la vidéo
      );
      clipUrls.push(url);
    }

    // Plusieurs segments → on les concatène en une vidéo continue (hébergée fal).
    let finalUrl = clipUrls[0];
    if (clipUrls.length > 1) {
      const concatRes = await authFetch("/api/video/concat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipUrls }),
      });
      const concatData = await concatRes.json().catch(() => ({}));
      if (concatRes.ok && concatData.videoUrl) {
        finalUrl = concatData.videoUrl as string;
        console.log(
          `[STEP4] ${clipUrls.length} segments concaténés (${targetDuration}s)`
        );
      } else {
        console.warn(
          "[STEP4] Concat échouée, fallback 1er segment:",
          concatData.error || ""
        );
      }
    }

    callbacks?.onPoll?.(100);
    console.log("[STEP4] Vidéo OK en", Date.now() - started, "ms");
    return { videoUrl: finalUrl, videoBase64: null };
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
  const [saveError, setSaveError] = useState("");
  const [audios, setAudios] = useState<Record<number, AudioAsset>>({});
  const [selectedVoice, setSelectedVoice] = useState("eve");
  const selectedVoiceRef = useRef(selectedVoice);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  const isAppAd = product.productType === "app";

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  const scenes = useMemo(
    () => getActiveScenes(product, script),
    [product, script]
  );
  const sceneImageId = (index: number) => `scene_${index + 1}`;

  const hasAllImages = scenes.every((_, i) => images[sceneImageId(i)]);
  const voiceDemoCategory = resolveVoiceDemoCategory(product);

  const nScenes = scenes.length;
  const costPerScene =
    CREDIT_COSTS.video + CREDIT_COSTS.voice + CREDIT_COSTS.lipsync;
  // Segments vidéo supplémentaires pour les scènes > 20s (LTX plafonne à 20s).
  const extraSegments = scenes.reduce(
    (sum, sc) =>
      sum +
      Math.max(
        0,
        planSegmentDurations(sc.duration_seconds || 15).length - 1
      ),
    0
  );
  const videoCost =
    videoStepCreditTotal(nScenes) + extraSegments * CREDIT_COSTS.video;

  useEffect(() => {
    void authFetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.credits === "number") {
          setUserCredits(data.credits);
        }
      })
      .catch(() => {});
  }, []);

  const generateAndAssemble = async () => {
    const activeVoice = selectedVoiceRef.current || selectedVoice || "eve";
    console.log("[STEP4] Voix utilisée (ref):", activeVoice, "| state:", selectedVoice);
    if (isAppAd) {
      console.log("[STEP4] Pub appli — ElevenLabs prioritaire, pas de lip sync fal");
    }

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
        audioBase64?: string | null;
        audioMimeType?: string | null;
        fallbackVideoUrl?: string | null;
        embeddedAudio?: boolean;
      }
    > = {};
    const total = scenes.length;
    const voiceStyle = buildLtxVoiceStyleHint(activeVoice);

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
        `Scène ${sc.number}/${total} — animation PubMoi + voix...`
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
                `Scène ${sc.number}/${total} — vidéo PubMoi + voix...`
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

        setProgressLabel(
          `Scène ${sc.number}/${total} — génération voix...`
        );

        console.log(`[STEP4] Scène ${sc.number} — appel /api/voice, voix:`, activeVoice);

        const voiceRes = await authFetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sc.voiceover.trim(),
            voiceName: activeVoice,
            emotion: sc.emotion,
            narrativeRole: sc.narrative_role,
            productType: product.productType || "product",
          }),
        });
        const voiceData = await voiceRes.json().catch(() => ({}));
        if (!voiceRes.ok || !voiceData.audioBase64) {
          throw new Error(
            voiceData.error || `Voix manquante pour la scène ${sc.number}`
          );
        }

        console.log(
          `[STEP4] Scène ${sc.number} — voix serveur:`,
          voiceData.usedVoiceId || voiceData.voiceId,
          "| provider:",
          voiceData.provider,
          "| demandée:",
          activeVoice
        );

        // Lip sync réel : on envoie la vidéo muette + la voix au modèle
        // sync-lipsync qui ré-anime la bouche pour qu'elle dise exactement le
        // mot au bon moment. La vidéo renvoyée contient déjà la voix calée
        // (audio embarqué). En cas d'échec, le serveur retombe sur un mux et
        // renvoie quand même une vidéo + voix.
        setProgressLabel(
          `Scène ${sc.number}/${total} — synchronisation labiale...`
        );

        let syncedVideoUrl: string | null = null;
        try {
          const lipRes = await authFetch("/api/lipsync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoUrl: video.videoUrl,
              audioBase64: voiceData.audioBase64,
              productType: product.productType || "product",
              template: product.template,
              prepaid: true,
            }),
          });
          const lipData = await lipRes.json().catch(() => ({}));
          if (lipRes.ok && lipData.videoUrl) {
            syncedVideoUrl = lipData.videoUrl as string;
            console.log(
              `[STEP4] Scène ${sc.number} — lip sync:`,
              lipData.mode,
              "| appliqué:",
              lipData.lipsyncApplied
            );
          } else {
            console.warn(
              `[STEP4] Scène ${sc.number} — lip sync sans URL, fallback mux`,
              lipData.error || ""
            );
          }
        } catch (lipErr) {
          console.warn(
            `[STEP4] Scène ${sc.number} — lip sync échoué, fallback mux`,
            lipErr
          );
        }

        // On garde la voix TTS comme piste audio : sur la vidéo synchronisée
        // c'est exactement le même audio (la bouche est calée dessus →
        // alignement parfait) et ça garantit la voix même si l'URL
        // synchronisée échoue et qu'on retombe sur la vidéo LTX muette.
        sceneVideos[sc.number] = {
          videoUrl: syncedVideoUrl || video.videoUrl,
          fallbackVideoUrl: video.videoUrl,
          videoBase64: null,
          audioBase64: voiceData.audioBase64 as string,
          audioMimeType: (voiceData.mimeType as string) || "audio/mp3",
          embeddedAudio: Boolean(syncedVideoUrl),
        };

        setAudios((prev) => ({
          ...prev,
          [sc.number]: {
            base64: voiceData.audioBase64 as string,
            mimeType: (voiceData.mimeType as string) || "audio/mp3",
          },
        }));

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
        "Aucune vidéo générée. Réessaie dans quelques instants ou contacte le support PubMoi."
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
        return {
          videoUrl: sv?.videoUrl || null,
          fallbackVideoUrl: sv?.fallbackVideoUrl || null,
          videoBase64: sv?.videoBase64 || null,
          embeddedAudio: sv?.embeddedAudio || false,
          audioBase64: sv?.audioBase64 || null,
          audioMimeType: sv?.audioMimeType || "audio/mp3",
        };
      });

    try {
      setProgress(90);
      const res = await authFetch("/api/assemble", {
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
      // Enregistrement automatique dans « Mes pubs » dès que la vidéo est prête.
      void persistAd(dataUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur assemblage");
      setStep("error");
    }
  };

  const persistAd = async (finalVideoUrl: string) => {
    if (!finalVideoUrl || savedOk) return;

    setSaving(true);
    setSaveError("");
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

      const res = await authFetch("/api/ads/save", {
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
          finalVideoUrl,
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
      setSaveError(e instanceof Error ? e.message : "Échec de la sauvegarde");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveToDashboard = () => {
    if (finalVideo) void persistAd(finalVideo);
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
          PubMoi Video + voix IA (sans musique de fond) — {scenes.length === 1 ? "ton image" : `les ${scenes.length} scènes`}{" "}
          (~1–2 min par scène). Aperçu vocal ci-dessous.
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
          onClick={() => setShowConfirm(true)}
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

        {showConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 20,
            }}
          >
            <div
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: 32,
                maxWidth: 400,
                width: "100%",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <h3
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Générer la vidéo finale
              </h3>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                {nScenes} scène{nScenes > 1 ? "s" : ""} × {costPerScene} crédits
                (vidéo + voix{isAppAd ? "" : " + lip sync"})
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  marginBottom: 20,
                }}
              >
                Voix :{" "}
                {VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name ||
                  selectedVoice}
                {isAppAd
                  ? " · Style Pixar : voix mixée sur la vidéo"
                  : ""}
              </p>
              <div
                style={{
                  background: "rgba(232,49,58,0.1)",
                  border: "1px solid rgba(232,49,58,0.3)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <p
                  style={{
                    color: "#E8313A",
                    fontSize: 28,
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  {videoCost} crédits
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  {userCredits !== null
                    ? `Il vous restera ${Math.max(0, userCredits - videoCost)} crédits`
                    : "Solde en cours de chargement…"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    void generateAndAssemble();
                  }}
                  disabled={
                    userCredits !== null && userCredits < videoCost
                  }
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: "#E8313A",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity:
                      userCredits !== null && userCredits < videoCost
                        ? 0.5
                        : 1,
                  }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
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
          fontSize: 12.5,
          fontWeight: 600,
          padding: "7px 14px",
          borderRadius: 99,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: saveError
            ? "rgba(248,113,113,0.12)"
            : savedOk
              ? "rgba(34,197,94,0.12)"
              : "var(--bg2)",
          border: `1px solid ${
            saveError
              ? "rgba(248,113,113,0.35)"
              : savedOk
                ? "rgba(34,197,94,0.3)"
                : "var(--border)"
          }`,
          color: saveError ? "#fca5a5" : savedOk ? "#86efac" : "var(--text2)",
        }}
      >
        {saveError
          ? `⚠️ Échec de l'enregistrement — ${saveError}`
          : savedOk
            ? "✓ Enregistrée automatiquement dans Mes pubs"
            : saving
              ? "💾 Enregistrement dans Mes pubs…"
              : "💾 Enregistrement…"}
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

        {!savedOk && (
          <button
            type="button"
            onClick={saveToDashboard}
            disabled={saving}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg2)",
              color: "var(--text2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {saving ? "..." : saveError ? "↻ Réessayer l'enregistrement" : "💾 Enregistrer maintenant"}
          </button>
        )}

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
