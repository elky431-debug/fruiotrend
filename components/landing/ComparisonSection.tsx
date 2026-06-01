const BEFORE = [
  "6 logiciels différents à payer",
  "Des heures de montage manuel",
  "Visuels qui ne ressemblent pas au produit",
  "Voix off à enregistrer ou sous-traiter",
  "Recadrage manuel pour chaque format",
];

const AFTER = [
  "Un seul outil, un seul abonnement",
  "Vidéo prête en 5 minutes",
  "Produit fidèle sur chaque scène",
  "Voix générée et synchronisée",
  "Format 9:16 natif, prêt à publier",
];

export function ComparisonSection() {
  return (
    <section className="landing-section">
      <div className="landing-section-inner" style={{ textAlign: "center" }}>
        <h2 className="landing-h2">
          Arrête de <span className="text-gradient">galérer</span>
        </h2>
        <p className="landing-sub">
          Ce que tu vis aujourd&apos;hui vs ce que PubMoi change.
        </p>

        <div className="landing-compare-grid">
          <div className="landing-compare-col before">
            <div className="landing-compare-head">
              <span className="landing-compare-tag tag-before">Sans PubMoi</span>
            </div>
            <ul className="landing-compare-list">
              {BEFORE.map((item) => (
                <li key={item}>
                  <span className="landing-compare-x">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-compare-col after">
            <div className="landing-compare-head">
              <span className="landing-compare-tag tag-after">Avec PubMoi</span>
            </div>
            <ul className="landing-compare-list">
              {AFTER.map((item) => (
                <li key={item}>
                  <span className="landing-compare-check">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
