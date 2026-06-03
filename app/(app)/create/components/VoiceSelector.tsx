"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VOICE_OPTIONS, type VoiceOption } from "@/lib/voices";

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
  productCategory?: string;
}

export default function VoiceSelector({
  selectedVoice,
  onSelect,
  productCategory = "default",
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<VoiceOption[]>(VOICE_OPTIONS);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setVoicesLoading(true);
      try {
        const res = await fetch("/api/voices");
        const data = await res.json();
        if (!cancelled && data.voices?.length) {
          setVoices(data.voices);
        }
      } catch (e) {
        console.warn("[VOICE] Liste voix:", e);
      } finally {
        if (!cancelled) setVoicesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, []);

  const filteredVoices = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter(
      (v) =>
        v.id.includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.gender.includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [voices, filter]);

  const playPreview = async (voiceId: string) => {
    if (previewLoading) return;
    setPreviewError(null);
    setPreviewLoading(voiceId);

    try {
      audioRef.current?.pause();

      const res = await fetch("/api/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceName: voiceId,
          category: productCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erreur aperçu voix");
      }

      const audio = new Audio(
        `data:${data.mimeType || "audio/mp3"};base64,${data.audioBase64}`
      );
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      setPreviewError(
        e instanceof Error ? e.message : "Impossible de lire l'aperçu"
      );
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        textAlign: "left",
      }}
    >
      <h3
        style={{
          color: "var(--text)",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        🎙️ Voix Grok TTS
      </h3>
      <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 12 }}>
        {voicesLoading
          ? "Chargement…"
          : `${voices.length} voix — clique ▶ pour écouter un aperçu (GROK ou FAL_API_KEY)`}
      </p>

      <input
        type="search"
        placeholder="Rechercher une voix…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 14,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg3)",
          color: "var(--text)",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
        }}
      />

      {previewError && (
        <p
          role="alert"
          style={{
            fontSize: 12,
            color: "#ff8fa3",
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(227, 43, 69, 0.1)",
          }}
        >
          {previewError}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
          maxHeight: 320,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isPreviewing = previewLoading === voice.id;
          return (
            <div
              key={voice.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(voice.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(voice.id);
              }}
              style={{
                background: isSelected
                  ? "rgba(255, 92, 157, 0.1)"
                  : "var(--bg3)",
                border: `1px solid ${
                  isSelected ? "rgba(255,92,157,0.45)" : "var(--border)"
                }`,
                borderRadius: 12,
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--bg4)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {voice.emoji}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      color: isSelected ? "var(--accent-warm)" : "var(--text)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {voice.name}
                  </span>
                </div>
                <div style={{ color: "var(--text2)", fontSize: 11 }}>
                  {voice.description}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void playPreview(voice.id);
                }}
                disabled={Boolean(previewLoading)}
                title="Écouter un aperçu"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  background: "var(--bg4)",
                  color: "var(--text)",
                  fontSize: 11,
                  cursor: previewLoading ? "wait" : "pointer",
                  flexShrink: 0,
                }}
              >
                {isPreviewing ? "…" : "▶"}
              </button>

              {isSelected && (
                <span style={{ color: "var(--accent-warm)", fontSize: 14 }}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {!voicesLoading && filteredVoices.length === 0 && (
        <p style={{ color: "var(--text2)", fontSize: 12, marginTop: 12 }}>
          Aucune voix ne correspond à ta recherche.
        </p>
      )}
    </div>
  );
}
