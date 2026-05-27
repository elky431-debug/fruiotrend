import Image from "next/image";
import Link from "next/link";

const PREVIEW_CARDS = [
  {
    badge: "HOOK",
    src: "/landing/drama-cuisine.png",
    alt: "Pub produit — accroche",
  },
  {
    badge: "9:16",
    src: "/landing/drama-chantier.png",
    alt: "Scène cartoon dropshipping",
  },
  {
    badge: "TIKTOK",
    src: "/landing/drama-rue.png",
    alt: "Format vertical pub IA",
  },
];

export function HeroSection() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-grid">
        <div>
          <span className="badge badge-accent">📢 Pub dropshipping IA</span>

          <h1 className="landing-h1" style={{ marginTop: "1.5rem" }}>
            Crée des pubs
            <br />
            <span className="text-gradient">AdCreative</span>
            <br />
            en 5 minutes
          </h1>

          <p className="landing-lead">
            Upload ton produit, script GPT, visuels Gemini avec référence produit,
            animation Grok 9:16 avec voix Gemini TTS — prêt pour TikTok et Meta.
          </p>

          <Link
            href="/create"
            className="btn-primary"
            style={{
              marginTop: "2rem",
              display: "inline-flex",
              padding: "1rem 2rem",
              fontSize: "1.05rem",
              textDecoration: "none",
            }}
          >
            Commencer maintenant →
          </Link>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex" }}>
              {["📢", "🛒", "🎬"].map((e, i) => (
                <span
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    marginLeft: i > 0 ? -8 : 0,
                    borderRadius: "50%",
                    border: "2px solid #0a0806",
                    background: "#1a1612",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "#c4b5a8" }}>
              <strong style={{ color: "#fff8f2" }}>2 000+</strong> créateurs{" "}
              <span style={{ color: "#f5b623" }}>★★★★★</span>
            </p>
          </div>
        </div>

        <div className="landing-hero-phones">
          {PREVIEW_CARDS.map((card) => (
            <div key={card.src} className="landing-phone-card">
              <span className="landing-phone-badge">{card.badge}</span>
              <div className="landing-phone-frame">
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={360}
                  height={640}
                  priority={card.badge === "TIKTOK"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
