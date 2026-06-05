import Image from "next/image";
import Link from "next/link";
import { LANDING_PREVIEW_IMAGES } from "@/lib/landingPreviews";

const PREVIEW_CARDS = [
  {
    badge: "PRODUIT VIVANT",
    src: LANDING_PREVIEW_IMAGES.produitVivant.srcPortrait,
    alt: LANDING_PREVIEW_IMAGES.produitVivant.alt,
  },
  {
    badge: "INFLUENCEUR",
    src: LANDING_PREVIEW_IMAGES.influenceur.srcPortrait,
    alt: LANDING_PREVIEW_IMAGES.influenceur.alt,
  },
  {
    badge: "FRUIT DRAMA",
    src: LANDING_PREVIEW_IMAGES.fruitDrama.srcPortrait,
    alt: LANDING_PREVIEW_IMAGES.fruitDrama.alt,
  },
  {
    badge: "WOJAK NPC",
    src: LANDING_PREVIEW_IMAGES.wojakNpc.srcPortrait,
    alt: LANDING_PREVIEW_IMAGES.wojakNpc.alt,
  },
];

export function HeroSection() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-grid">
        <div>
          <span className="badge badge-accent">📢 Pub dropshipping IA</span>

          <h1 className="landing-h1" style={{ marginTop: "1.5rem" }}>
            La pub qui
            <br />
            <span className="text-gradient">stoppe le scroll</span>
            <br />
            en 5 minutes
          </h1>

          <p className="landing-lead">
            Une photo de ton produit, et l&apos;IA s&apos;occupe du reste : script,
            visuels 3D et vidéo 9:16 avec voix. Tu publies sur TikTok et Meta —
            sans caméra, sans freelance.
          </p>

          <Link href="/create" className="btn-primary landing-hero-cta">
            Commencer maintenant →
          </Link>

          <div className="landing-hero-social">
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
              <span style={{ color: "#ff5c9d" }}>★★★★★</span>
            </p>
          </div>
        </div>

        <div className="landing-hero-phones scroll-x">
          {PREVIEW_CARDS.map((card, i) => (
            <div key={card.src} className="landing-phone-card">
              <span className="landing-phone-badge">{card.badge}</span>
              <div className="landing-phone-frame">
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  quality={92}
                  className="landing-media-img landing-phone-preview-img"
                  sizes="(max-width: 640px) 140px, 180px"
                  priority={i < 2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
