import Image from "next/image";
import { LANDING_PREVIEW_IMAGES } from "@/lib/landingPreviews";
import { TestimonialVideo } from "@/components/landing/TestimonialVideo";

type TestimonialItem = {
  handle: string;
  quote: string;
  stats?: string;
} & (
  | { media: "video"; videoSrc: string }
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
    handle: "@pistolero",
    quote:
      "Une pub PubMoi et notre CA a doublé. Le format TikTok convertit enfin sans équipe créa.",
    media: "video",
    videoSrc: "/landing/testimonial-pistolero.mp4",
    stats: "CA ×2",
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
      <TestimonialVideo
        src={item.videoSrc}
        label={`Vidéo ${item.handle}`}
      />
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.alt}
      fill
      className="landing-media-img"
      sizes="(max-width: 767px) 100vw, 33vw"
      loading="lazy"
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
        <p className="landing-testimonials-hint">3 marques · résultats réels</p>
        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
              <article key={t.handle} className="landing-testimonial-card">
                <div className="landing-testimonial-media">
                  <TestimonialMedia item={t} />
                </div>
                <div className="landing-testimonial-body">
                  <div className="landing-testimonial-handle">
                    <span className="landing-testimonial-avatar">📢</span>
                    {t.handle}
                  </div>
                  <p className="landing-testimonial-quote">
                    &ldquo;{t.quote}&rdquo;
                  </p>
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
