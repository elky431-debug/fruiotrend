import Image from "next/image";
import Link from "next/link";
import { LANDING_PREVIEW_IMAGES } from "@/lib/landingPreviews";

const STEPS = [
  {
    step: "ÉTAPE 1",
    title: "Upload ton produit",
    desc: "Nom, description, audience et objectif pub. Ajoute des photos produit pour guider les visuels.",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    alt: "Upload produit — influenceur cartoon",
  },
  {
    step: "ÉTAPE 2",
    title: "Script & visuels IA",
    desc: "GPT-4o rédige le script pub FR. Gemini génère personnage cartoon et scènes 9:16 avec ton produit.",
    ...LANDING_PREVIEW_IMAGES.produitVivant,
    alt: "Visuel Produit Vivant généré",
  },
  {
    step: "ÉTAPE 3",
    title: "Vidéo LTX + voix intégrée",
    desc: "LTX 2.3 Fast anime chaque scène avec audio synchronisé. Assemble et publie sur TikTok / Meta.",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    alt: "Vidéo pub influenceur 9:16",
  },
];

export function HowItWorksSection() {
  return (
    <section className="landing-steps-section">
      <div className="landing-steps-inner">
        <h2 className="landing-h2">
          Pipeline pub{" "}
          <span className="text-gradient">dropshipping complet</span>
        </h2>
        <p className="landing-sub">
          De la fiche produit à la pub verticale — script, visuels et vidéos en français.
        </p>

        <div className="landing-steps-grid">
          {STEPS.map((s) => (
            <article key={s.step} className="landing-step-card">
              <div className="landing-step-image">
                <Image
                  src={s.src}
                  alt={s.alt}
                  width={360}
                  height={640}
                  className="landing-media-img"
                />
              </div>
              <div className="landing-step-body">
                <p className="landing-step-label">{s.step}</p>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <Link
          href="/create"
          className="btn-primary"
          style={{ marginTop: "2.5rem", display: "inline-flex", textDecoration: "none" }}
        >
          Commencer maintenant →
        </Link>
      </div>
    </section>
  );
}
