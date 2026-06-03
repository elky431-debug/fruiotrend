import Link from "next/link";

const STEPS = [
  {
    step: "ÉTAPE 1",
    title: "Upload ton produit",
    desc: "Nom, description, audience et objectif pub. Ajoute des photos produit pour guider les visuels.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    step: "ÉTAPE 2",
    title: "Script & visuels IA",
    desc: "L'IA PubMoi rédige ton script en français et génère le personnage cartoon ainsi que les scènes 9:16 fidèles à ton produit.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M13 4v5h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 13h7M8 16.5h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    step: "ÉTAPE 3",
    title: "Vidéo + voix intégrée",
    desc: "PubMoi anime chaque scène avec une voix synchronisée, assemble le tout et te livre une pub prête pour TikTok / Meta.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="6"
          width="13"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M16 10.5 21 8v8l-5-2.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 12.5 9.5 14l3-3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
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
          De la fiche produit à la pub verticale — script, visuels et vidéos en
          français.
        </p>

        <div className="steps-schema">
          {STEPS.map((s, i) => (
            <div key={s.step} className="steps-schema-item">
              <div className="step-node">
                <div className="step-node-icon">{s.icon}</div>
                <span className="step-node-index">{i + 1}</span>
                <p className="step-node-label">{s.step}</p>
                <h3 className="step-node-title">{s.title}</h3>
                <p className="step-node-desc">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="step-connector" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h13m0 0-5-5m5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <Link
          href="/create"
          className="btn-primary"
          style={{
            marginTop: "2.5rem",
            display: "inline-flex",
            textDecoration: "none",
          }}
        >
          Commencer maintenant →
        </Link>
      </div>
    </section>
  );
}
