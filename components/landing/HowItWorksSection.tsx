import Image from "next/image";
import Link from "next/link";

const STEPS = [
  {
    step: "ÉTAPE 1",
    title: "Upload ton produit",
    desc: "Nom, description, audience et objectif pub. Ajoute des photos produit pour guider les visuels.",
    image: "/landing/drama-cuisine.png",
    alt: "Étape produit",
  },
  {
    step: "ÉTAPE 2",
    title: "Script & visuels IA",
    desc: "GPT-4o rédige le script pub FR. Gemini génère personnage cartoon et scènes 9:16 avec ton produit.",
    image: "/landing/drama-chantier.png",
    alt: "Script et images",
  },
  {
    step: "ÉTAPE 3",
    title: "Animation Grok + voix IA",
    desc: "Chaque scène devient une vidéo 10s avec voix off Gemini TTS. Télécharge et publie sur TikTok / Meta.",
    image: "/landing/drama-rue.png",
    alt: "Vidéos pub",
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
                  src={s.image}
                  alt={s.alt}
                  width={360}
                  height={640}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
