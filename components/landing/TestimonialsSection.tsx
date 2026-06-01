import Image from "next/image";
import { LANDING_PREVIEW_IMAGES } from "@/lib/landingPreviews";

const TESTIMONIALS = [
  {
    handle: "@zinzinstoriesfr",
    quote:
      "Avant je galérais entre 6 logiciels. Maintenant une fiche produit suffit pour une pub complète.",
    ...LANDING_PREVIEW_IMAGES.produitVivant,
    stats: "80,6K likes · 360 comments",
  },
  {
    handle: "@dr.skelix",
    quote:
      "Le produit reste fidèle sur chaque scène. Le style cartoon convertit mieux que mes anciennes pubs.",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    stats: "48K vues en 24h",
  },
  {
    handle: "@hamuyama_lab",
    quote:
      "Hook + voix intégrée LTX en une passe — exactement le format TikTok Ads que je cherchais.",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    stats: "201K likes",
  },
];

export function TestimonialsSection() {
  return (
    <section className="landing-testimonials-section">
      <div className="landing-testimonials-inner">
        <h2 className="landing-h2" style={{ textAlign: "center" }}>
          Ils cartonnent avec{" "}
          <span className="text-gradient">PubMoi</span>
        </h2>
        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <article key={t.handle} className="landing-testimonial-card">
              <div className="landing-testimonial-media">
                <Image
                  src={t.src}
                  alt={`Preview ${t.handle}`}
                  fill
                  className="landing-media-img"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="landing-testimonial-body">
                <div className="landing-testimonial-handle">
                  <span className="landing-testimonial-avatar">📢</span>
                  {t.handle}
                </div>
                <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                {t.stats && (
                  <p className="landing-testimonial-stats">{t.stats}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
