const FEATURES = [
  {
    icon: "✍️",
    title: "Script viral en 1 clic",
    desc: "L'IA PubMoi écrit un hook qui stoppe le scroll et un script de vente en français, calibré pour ta cible.",
    span: true,
  },
  {
    icon: "🎯",
    title: "Visuels fidèles à ton produit",
    desc: "PubMoi garde la forme, les couleurs et le packaging exacts de ta photo produit.",
  },
  {
    icon: "🎙️",
    title: "Voix intégrée",
    desc: "Animation et voix synchronisée par PubMoi — zéro montage de ton côté.",
  },
  {
    icon: "📱",
    title: "Format 9:16 natif",
    desc: "Prêt pour TikTok, Reels et Meta Ads, sans recadrage.",
  },
  {
    icon: "⚡",
    title: "5 minutes chrono",
    desc: "De la fiche produit à la vidéo finale, plus besoin de jongler entre 6 logiciels.",
    span: true,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-section-inner" style={{ textAlign: "center" }}>
        <span className="badge badge-accent">⚙️ Tout-en-un</span>
        <h2 className="landing-h2" style={{ marginTop: "1rem" }}>
          Tout ce qu&apos;il te faut pour{" "}
          <span className="text-gradient">scaler tes pubs</span>
        </h2>
        <p className="landing-sub">
          Un seul outil, du brief produit à la vidéo prête à publier.
        </p>

        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className={`landing-feature-card${f.span ? " span-2" : ""}`}
            >
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
