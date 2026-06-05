"use client";

import Link from "next/link";
import { useState } from "react";
import AdCreativeLayout from "./components/AdCreativeLayout";
import StoryWizard from "@/components/creator/StoryWizard";
import {
  IconMegaphone,
  IconClapperboard,
  IconLock,
  IconBox,
  IconSmartphone,
  IconArrowLeft,
} from "@/components/icons";

const titleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

type Mode = "story" | "classic";
type AdType = "product" | "app";

const cardBase: React.CSSProperties = {
  borderRadius: 20,
  padding: 28,
  cursor: "pointer",
  transition: "all 0.15s",
};

export default function CreatePage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [adType, setAdType] = useState<AdType | null>(null);

  if (!mode) {
    return (
      <div
        className="studio-page"
        style={{ maxWidth: 720, margin: "0 auto", background: "transparent" }}
      >
        <Link
          href="/dashboard"
          className="btn-sec"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <IconArrowLeft size={15} /> Mes pubs
        </Link>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px" }}>
          <h1
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Que veux-tu créer ?
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            Choisis le format de ta création
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setMode("classic")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setMode("classic");
              }}
              style={{
                ...cardBase,
                padding: 0,
                overflow: "hidden",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 2",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/create/classic.png"
                  alt="Pub Classique — personnage Pixar présentant un produit"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0) 55%)",
                  }}
                />
              </div>
              <div style={{ padding: 24 }}>
                <h2
                  style={{
                    ...titleRow,
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  <IconMegaphone size={20} /> Pub Classique
                </h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Le produit ou l&apos;appli parle directement à la caméra.
                  Script percutant, personnage Pixar, voix intégrée.
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {["Produit Vivant", "Influenceur", "Avant/Après"].map((t) => (
                    <span
                      key={t}
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 10,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              aria-disabled="true"
              title="History Ads — bientôt disponible"
              style={{
                ...cardBase,
                padding: 0,
                overflow: "hidden",
                background: "rgba(232,49,58,0.04)",
                border: "1px solid rgba(232,49,58,0.2)",
                position: "relative",
                cursor: "not-allowed",
                opacity: 0.92,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(10, 8, 6, 0.85)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,248,242,0.85)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 10,
                }}
              >
                <IconLock size={11} />
                Bientôt
              </div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 2",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/create/story.png"
                  alt="History Ads — Wojak NPC et Fruit Drama"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(0.35) brightness(0.75)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0) 55%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    background: "rgba(8, 5, 4, 0.45)",
                    backdropFilter: "blur(1px)",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,248,242,0.9)",
                    }}
                  >
                    <IconLock size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff8f2",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Ça arrive très bientôt
                  </span>
                </div>
              </div>
              <div style={{ padding: 24, opacity: 0.65 }}>
                <h2
                  style={{
                    ...titleRow,
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  <IconClapperboard size={20} /> History Ads
                </h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Une histoire courte et accrocheuse où le produit s&apos;intègre
                  naturellement. Choisis ton univers : Wojak NPC ou Fruit Drama.
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {["Wojak NPC", "Fruit Drama"].map((t) => (
                    <span
                      key={t}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "classic" && !adType) {
    return (
      <div
        className="studio-page"
        style={{ maxWidth: 720, margin: "0 auto", background: "transparent" }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px" }}>
          <button
            type="button"
            onClick={() => setMode(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              marginBottom: 32,
              fontSize: 14,
            }}
          >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconArrowLeft size={15} /> Retour
          </span>
        </button>

          <h2
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            C&apos;est pour quel type de produit ?
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAdType("product")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setAdType("product");
              }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 2",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/create/product.png"
                  alt="Produit physique — colis e-commerce"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0) 60%)",
                  }}
                />
              </div>
              <div style={{ padding: 20, textAlign: "center" }}>
                <h3
                  style={{
                    ...titleRow,
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  <IconBox size={19} /> Produit physique
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 13,
                    marginTop: 6,
                  }}
                >
                  Dropshipping, e-commerce
                </p>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAdType("app")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setAdType("app");
              }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 2",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/create/app.png"
                  alt="Appli / Site web — interface SaaS"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0) 60%)",
                  }}
                />
              </div>
              <div style={{ padding: 20, textAlign: "center" }}>
                <h3
                  style={{
                    ...titleRow,
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  <IconSmartphone size={19} /> Appli / Site web
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 13,
                    marginTop: 6,
                  }}
                >
                  SaaS, application mobile
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "classic" && adType) {
    return (
      <div
        className="studio-page"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "transparent",
          color: "var(--text)",
        }}
      >
        <Link
          href="/dashboard"
          className="btn-sec"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <IconArrowLeft size={15} /> Mes pubs
        </Link>
        <AdCreativeLayout
          initialProductMode={adType}
          hideProductModeToggle
          onBack={() => setAdType(null)}
        />
      </div>
    );
  }

  if (mode === "story") {
    return (
      <div
        className="studio-page"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "transparent",
          color: "var(--text)",
        }}
      >
        <Link
          href="/dashboard"
          className="btn-sec"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <IconArrowLeft size={15} /> Mes pubs
        </Link>
        <StoryWizard onBack={() => setMode(null)} />
      </div>
    );
  }

  return null;
}
