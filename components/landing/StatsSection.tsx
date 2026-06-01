const STATS = [
  { value: "12 000+", label: "Pubs générées" },
  { value: "5 min", label: "Par vidéo en moyenne" },
  { value: "3", label: "Formats créatifs" },
  { value: "9:16", label: "Prêt TikTok & Meta" },
];

export function StatsSection() {
  return (
    <section className="landing-stats-section">
      <div className="landing-stats-band">
        {STATS.map((s) => (
          <div key={s.label} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
