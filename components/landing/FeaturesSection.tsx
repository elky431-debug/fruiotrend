import type { ComponentType, SVGProps } from "react";
import {
  IconPencil,
  IconBox,
  IconMic,
  IconSmartphone,
  IconClock,
  IconLayers,
} from "@/components/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const FEATURES: {
  Icon: IconType;
  title: string;
  desc: string;
}[] = [
  {
    Icon: IconPencil,
    title: "Script viral en 1 clic",
    desc: "L'IA PubMoi écrit un hook qui stoppe le scroll et un script de vente en français, calibré pour ta cible.",
  },
  {
    Icon: IconBox,
    title: "Visuels fidèles à ton produit",
    desc: "PubMoi garde la forme, les couleurs et le packaging exacts de ta photo produit.",
  },
  {
    Icon: IconMic,
    title: "Voix intégrée",
    desc: "Animation et voix synchronisée par PubMoi — zéro montage de ton côté.",
  },
  {
    Icon: IconSmartphone,
    title: "Format 9:16 natif",
    desc: "Prêt pour TikTok, Reels et Meta Ads, sans recadrage.",
  },
  {
    Icon: IconClock,
    title: "5 minutes chrono",
    desc: "De la fiche produit à la vidéo finale, plus besoin de jongler entre 6 logiciels.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-section-inner" style={{ textAlign: "center" }}>
        <span className="badge badge-accent">
          <IconLayers size={14} aria-hidden />
          Tout-en-un
        </span>
        <h2 className="landing-h2" style={{ marginTop: "1rem" }}>
          Tout ce qu&apos;il te faut pour{" "}
          <span className="text-gradient">scaler tes pubs</span>
        </h2>
        <p className="landing-sub">
          Un seul outil, du brief produit à la vidéo prête à publier.
        </p>

        <ul className="landing-feature-list">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <li key={title} className="landing-feature-row">
              <span className="landing-feature-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="landing-feature-glyph" aria-hidden>
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <div className="landing-feature-body">
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-desc">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
