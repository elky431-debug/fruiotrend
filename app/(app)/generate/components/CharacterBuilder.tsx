"use client";

import { useEffect, useState } from "react";
import type { CharacterDef } from "@/types/character";

const STORAGE_KEY = "fruitdrama_characters";

const FRUIT_EMOJIS: Record<string, string> = {
  fraise: "🍓",
  mangue: "🥭",
  banane: "🍌",
  raisin: "🍇",
  cerise: "🍒",
  citron: "🍋",
  ananas: "🍍",
  pastèque: "🍉",
  pêche: "🍑",
  pomme: "🍎",
  orange: "🍊",
  kiwi: "🥝",
  avocat: "🥑",
  brocoli: "🥦",
  carotte: "🥕",
  tomate: "🍅",
  aubergine: "🍆",
  maïs: "🌽",
  poivron: "🫑",
  oignon: "🧅",
};

const ROLES = [
  "Protagoniste",
  "Antagoniste",
  "Traître",
  "Amour",
  "Rival(e)",
  "Confident(e)",
  "Victime",
  "Manipulateur/trice",
];

const PERSONALITIES = [
  "Jaloux/se",
  "Vengeur/se",
  "Naïf/ve",
  "Manipulateur/trice",
  "Passionné(e)",
  "Froid(e)",
  "Impulsif/ve",
  "Calculateur/trice",
  "Innocent(e)",
  "Ambitieux/se",
];

function emptyChar(): CharacterDef {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "",
    gender: "femme",
    outfit: "",
    personality: "",
    role: "Protagoniste",
    color: "",
    backstory: "",
    saved: false,
  };
}

interface Props {
  value: CharacterDef[];
  onChange: (chars: CharacterDef[]) => void;
}

export default function CharacterBuilder({ value, onChange }: Props) {
  const [library, setLibrary] = useState<CharacterDef[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLibrary(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const saveToLibrary = (char: CharacterDef) => {
    const updated = library.filter((c) => c.id !== char.id);
    updated.unshift({ ...char, saved: true });
    setLibrary(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const removeFromLibrary = (id: string) => {
    const updated = library.filter((c) => c.id !== id);
    setLibrary(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const addChar = () => {
    const newChar = emptyChar();
    onChange([...value, newChar]);
    setEditingId(newChar.id);
  };

  const addFromLibrary = (char: CharacterDef) => {
    if (value.find((c) => c.name === char.name && c.type === char.type)) return;
    onChange([...value, { ...char, id: crypto.randomUUID(), saved: false }]);
  };

  const updateChar = (id: string, updates: Partial<CharacterDef>) => {
    onChange(value.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChar = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const getEmoji = (type: string) =>
    FRUIT_EMOJIS[type.toLowerCase().trim()] || "🎭";

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {value.map((char, idx) => (
          <div
            key={char.id}
            style={{
              background: editingId === char.id ? "#181818" : "#111",
              border: `1px solid ${editingId === char.id ? "rgba(200,255,0,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 14,
              overflow: "hidden",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onClick={() => setEditingId(editingId === char.id ? null : char.id)}
          >
            <div
              style={{
                height: 80,
                background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                position: "relative",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {getEmoji(char.type) || "🎭"}
              {char.role && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 100,
                    background: "rgba(200,255,0,0.1)",
                    border: "1px solid rgba(200,255,0,0.2)",
                    color: "#C8FF00",
                    letterSpacing: "0.05em",
                  }}
                >
                  {char.role.toUpperCase()}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  display: "flex",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveToLibrary(char);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#888",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                  title="Sauvegarder"
                >
                  💾
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChar(char.id);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: "none",
                    background: "rgba(255,68,68,0.1)",
                    color: "#ff6666",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 14px" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: char.name ? "#fff" : "#444",
                  marginBottom: 3,
                }}
              >
                {char.name || `Personnage ${idx + 1}`}
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                {char.type
                  ? char.type.charAt(0).toUpperCase() + char.type.slice(1)
                  : "Type non défini"}
                {char.gender ? ` · ${char.gender}` : ""}
              </div>
              {char.personality && (
                <div
                  style={{
                    fontSize: 10,
                    color: "#444",
                    marginTop: 4,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                  }}
                >
                  {char.personality
                    .split(", ")
                    .slice(0, 2)
                    .map((p) => (
                      <span
                        key={p}
                        style={{
                          padding: "1px 6px",
                          borderRadius: 100,
                          background: "rgba(255,255,255,0.04)",
                          color: "#555",
                          border: "1px solid rgba(255,255,255,0.06)",
                          fontSize: 9,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {editingId === char.id && (
              <div
                style={{
                  padding: "0 14px 14px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    paddingTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#555",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 5,
                        }}
                      >
                        Nom
                      </div>
                      <input
                        value={char.name}
                        onChange={(e) =>
                          updateChar(char.id, { name: e.target.value })
                        }
                        placeholder="Strawbella..."
                        style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#555",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 5,
                        }}
                      >
                        Type
                      </div>
                      <input
                        value={char.type}
                        onChange={(e) =>
                          updateChar(char.id, { type: e.target.value })
                        }
                        placeholder="fraise..."
                        style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 5,
                      }}
                    >
                      Genre
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["femme", "homme"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateChar(char.id, { gender: g })}
                          style={{
                            flex: 1,
                            padding: "7px",
                            borderRadius: 8,
                            border: "none",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            background:
                              char.gender === g
                                ? "rgba(200,255,0,0.1)"
                                : "rgba(255,255,255,0.04)",
                            color: char.gender === g ? "#C8FF00" : "#555",
                            outline:
                              char.gender === g
                                ? "1px solid rgba(200,255,0,0.3)"
                                : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {g === "femme" ? "👩 Femme" : "👨 Homme"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 5,
                      }}
                    >
                      Rôle
                    </div>
                    <select
                      value={char.role}
                      onChange={(e) =>
                        updateChar(char.id, { role: e.target.value })
                      }
                      style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 5,
                      }}
                    >
                      Tenue
                    </div>
                    <input
                      value={char.outfit}
                      onChange={(e) =>
                        updateChar(char.id, { outfit: e.target.value })
                      }
                      placeholder="robe rouge pailletée..."
                      style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8 }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 5,
                      }}
                    >
                      Personnalité
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {PERSONALITIES.map((p) => {
                        const on = char.personality?.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              const cur =
                                char.personality?.split(", ").filter(Boolean) || [];
                              const next = on
                                ? cur.filter((x) => x !== p)
                                : [...cur, p];
                              updateChar(char.id, {
                                personality: next.join(", "),
                              });
                            }}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 100,
                              border: "none",
                              fontSize: 10,
                              cursor: "pointer",
                              fontWeight: 500,
                              background: on
                                ? "rgba(200,255,0,0.1)"
                                : "rgba(255,255,255,0.04)",
                              color: on ? "#C8FF00" : "#555",
                              outline: on
                                ? "1px solid rgba(200,255,0,0.25)"
                                : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 5,
                      }}
                    >
                      Backstory
                    </div>
                    <textarea
                      value={char.backstory}
                      onChange={(e) =>
                        updateChar(char.id, { backstory: e.target.value })
                      }
                      rows={2}
                      placeholder="Son passé, son secret, sa motivation..."
                      style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8 }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    style={{
                      background: "#C8FF00",
                      color: "#000",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    ✓ Valider
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {value.length < 4 && (
          <button
            type="button"
            onClick={addChar}
            style={{
              background: "transparent",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 14,
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              transition: "all 0.15s",
              color: "#444",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "rgba(200,255,0,0.3)";
              el.style.color = "#C8FF00";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "rgba(255,255,255,0.1)";
              el.style.color = "#444";
            }}
          >
            <div style={{ fontSize: 24 }}>+</div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>Ajouter un personnage</div>
          </button>
        )}
      </div>

      {library.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#444",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Bibliothèque
            <span
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#555",
                fontSize: 9,
                padding: "1px 7px",
                borderRadius: 100,
              }}
            >
              {library.length} sauvegardés
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {library.map((char) => (
              <div
                key={char.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 100,
                  padding: "5px 10px 5px 6px",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#1A1A1A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  {getEmoji(char.type)}
                </div>
                <span style={{ fontSize: 12, color: "#888" }}>{char.name}</span>
                <button
                  type="button"
                  onClick={() => addFromLibrary(char)}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 100,
                    background: "rgba(200,255,0,0.08)",
                    color: "#C8FF00",
                    border: "1px solid rgba(200,255,0,0.2)",
                    cursor: "pointer",
                  }}
                >
                  + AJOUTER
                </button>
                <button
                  type="button"
                  onClick={() => removeFromLibrary(char.id)}
                  style={{
                    fontSize: 10,
                    color: "#333",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
