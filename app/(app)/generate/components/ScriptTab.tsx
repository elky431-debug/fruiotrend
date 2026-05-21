"use client";

import { useState } from "react";
import type { CharacterDef } from "@/types/character";
import type { DramaScript } from "@/types/studio";
import CharacterBuilder from "./CharacterBuilder";
import ScriptDisplay from "./ScriptDisplay";

const UNIVERS = ["Fruits", "Légumes", "Snacks", "Fast-food", "Tech", "Boissons"];
const GENRES = ["Drama", "Téléréalité", "Comédie", "Thriller", "Royauté"];
const N_SCENES = ["3", "4", "5", "6"];
const DURATIONS = ["18s", "30s", "60s", "120s"];

interface Props {
  onScriptGenerated: (script: DramaScript) => void;
  script: DramaScript | null;
  onContinue?: () => void;
}

const sectionStyle = {
  background: "#0D0D0D",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
  padding: 28,
} as const;

const stepBadge = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(200,255,0,0.1)",
  border: "1px solid rgba(200,255,0,0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  color: "#C8FF00",
} as const;

export default function ScriptTab({
  onScriptGenerated,
  script,
  onContinue,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState<CharacterDef[]>([]);
  const [univers, setUnivers] = useState("Fruits");
  const [genre, setGenre] = useState("Drama");
  const [nScenes, setNScenes] = useState("4");
  const [duration, setDuration] = useState("30s");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateScript = async () => {
    if (!prompt.trim()) {
      setError("Décris ton idée de drama.");
      return;
    }
    if (characters.length < 2) {
      setError("Ajoute au moins 2 personnages pour créer un vrai drama !");
      return;
    }
    const incomplete = characters.find((c) => !c.name.trim() || !c.type.trim());
    if (incomplete) {
      setError("Complète le nom et le type de chaque personnage.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          univers,
          genre,
          nScenes: parseInt(nScenes, 10),
          duration,
          characters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur API");
      onScriptGenerated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
    setLoading(false);
  };

  const paramGroups = [
    { label: "Genre", opts: GENRES, val: genre, set: setGenre },
    { label: "Univers", opts: UNIVERS, val: univers, set: setUnivers },
    { label: "Scènes", opts: N_SCENES, val: nScenes, set: setNScenes },
    { label: "Durée", opts: DURATIONS, val: duration, set: setDuration },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={stepBadge}>1</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
              Tes personnages
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>
              Min. 2 · Max. 4 personnages
            </div>
          </div>
          {characters.length >= 2 && (
            <div style={{ marginLeft: "auto" }} className="badge badge-green">
              ✓ {characters.length} personnages
            </div>
          )}
        </div>
        <CharacterBuilder value={characters} onChange={setCharacters} />
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={stepBadge}>2</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
              Ton drama
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>
              Plus tu es précis(e), plus l&apos;intrigue sera forte
            </div>
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder={`Décris précisément ce qui se passe...\n\nEx: Strawbella découvre que Mangello, son mari depuis 5 ans, la trompe avec Citronella sa meilleure amie. Elle organise un dîner où tout sera révélé...`}
          style={{ fontSize: 14, lineHeight: 1.7, borderRadius: 12, padding: "14px 16px" }}
        />
        <div
          style={{
            fontSize: 11,
            color: "#333",
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>💡</span>
          Décris les motivations, les secrets et les enjeux de chaque personnage
        </div>
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={stepBadge}>3</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
            Paramètres
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {paramGroups.map(({ label, opts, val, set }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                {label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {opts.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set(opt)}
                    className={`chip ${val === opt ? "active" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={generateScript}
        disabled={loading || characters.length < 2}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "none",
          background: characters.length >= 2 ? "#C8FF00" : "#1A1A1A",
          color: characters.length >= 2 ? "#000" : "#333",
          fontSize: 15,
          fontWeight: 700,
          cursor: characters.length >= 2 ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transition: "all 0.2s",
          letterSpacing: "-0.01em",
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(0,0,0,0.2)",
                borderTopColor: "#000",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            GPT-4o construit l&apos;intrigue...
          </>
        ) : (
          <>✦ Générer le script</>
        )}
      </button>

      {characters.length < 2 && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#333" }}>
          Ajoute au moins 2 personnages pour activer la génération
        </div>
      )}

      {error && (
        <div
          style={{
            background: "rgba(255,68,68,0.08)",
            border: "1px solid rgba(255,68,68,0.2)",
            color: "#ff8888",
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {script && (
        <>
          <ScriptDisplay script={script} />
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", borderRadius: 14, padding: "14px" }}
            >
              Continuer vers Images →
            </button>
          )}
        </>
      )}
    </div>
  );
}
