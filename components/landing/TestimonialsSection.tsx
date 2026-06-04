import Image from "next/image";
import { LANDING_PREVIEW_IMAGES } from "@/lib/landingPreviews";

type TestimonialItem = {
  handle: string;
  quote: string;
  stats?: string;
} & (
  | { media: "video"; videoSrc: string; poster?: string }
  | { media: "image"; src: string; alt: string }
);

const TESTIMONIALS: TestimonialItem[] = [
  {
    handle: "@jobump",
    quote:
      "Cette pub PubMoi m'a aidé à décrocher mes premiers clients. Un brief, une vidéo — c'est tout.",
    media: "video",
    videoSrc: "/landing/testimonial-jobump.mp4",
    stats: "Premiers clients en 48h",
  },
  {
    handle: "@dr.skelix",
    quote:
      "Le produit reste fidèle sur chaque scène. Le style cartoon convertit mieux que mes anciennes pubs.",
    media: "image",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    stats: "48K vues en 24h",
  },
  {
    handle: "@hamuyama_lab",
    quote:
      "Hook + voix intégrée PubMoi en une passe — exactement le format TikTok Ads que je cherchais.",
    media: "image",
    ...LANDING_PREVIEW_IMAGES.influenceur,
    stats: "201K likes",
  },
];

function TestimonialMedia({ item }: { item: TestimonialItem }) {
  if (item.media === "video") {
    return (
      <video
        src={item.videoSrc}
        poster={item.poster}
        className="landing-media-img"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`Vidéo ${item.handle}`}
      />
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.alt}
      fill
      className="landing-media-img"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );
}

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
              <div
                className={`landing-testimonial-media${
                  t.media === "video" ? " landing-testimonial-media--video" : ""
                }`}
              >
                <TestimonialMedia item={t} />
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
