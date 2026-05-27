import Image from "next/image";

const TESTIMONIALS = [
  {
    handle: "@zinzinstoriesfr",
    quote:
      "Avant je galérais entre 6 logiciels. Maintenant une fiche produit suffit pour une pub complète.",
    image: "/landing/drama-cuisine.png",
    stats: "80,6K likes · 360 comments",
  },
  {
    handle: "@dr.skelix",
    quote:
      "Le produit reste fidèle sur chaque scène. Le style cartoon convertit mieux que mes anciennes pubs.",
    image: "/landing/drama-chantier.png",
    stats: "48K vues en 24h",
  },
  {
    handle: "@hamuyama_lab",
    quote:
      "Hook + voix off FR en 8s — exactement le format TikTok Ads que je cherchais.",
    image: "/landing/drama-rue.png",
    stats: "201K likes",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-10 text-center text-3xl font-extrabold">
          Ils cartonnent avec{" "}
          <span className="text-gradient">AdCreative</span>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.handle}
              className="overflow-hidden rounded-2xl border border-border bg-bg-card transition hover:border-accent-warm/25 hover:shadow-golden"
            >
              <div className="relative aspect-[9/16] max-h-52 overflow-hidden">
                <Image
                  src={t.image}
                  alt={`Preview ${t.handle}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/20 to-transparent" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-warm text-sm">
                    📢
                  </div>
                  <span className="font-medium text-white">{t.handle}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  &ldquo;{t.quote}&rdquo;
                </p>
                {t.stats && (
                  <p className="mt-2 text-xs font-semibold text-accent-warm">
                    {t.stats}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
