import Link from "next/link";

const PREVIEW_CARDS = [
  { badge: "FAITE EN 5 MIN", rotate: "-rotate-3", z: "z-10" },
  { badge: "FAITE EN 1 PROMPT", rotate: "rotate-2", z: "z-20" },
  { badge: "FAITE SANS MONTAGE", rotate: "-rotate-1", z: "z-30" },
];

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            🎯 Générateur de vidéos IA #1
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-tight lg:text-6xl">
            Crée des vidéos de
            <br />
            <span className="text-accent">Fruits IA</span>
            <br />
            en 5 minutes
          </h1>

          <p className="mt-6 max-w-lg text-lg text-text-secondary">
            Un seul outil pour créer des vidéos TikTok, Reels et Shorts. Scripts,
            images, vidéos et sous-titres en 5 minutes.
          </p>

          <Link href="/generate" className="btn-primary mt-8 inline-flex px-8 py-4 text-lg">
            Commencer maintenant →
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["🍓", "🍌", "🍇", "🥑"].map((e, i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg-primary bg-bg-card text-sm"
                >
                  {e}
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              Rejoint par <strong className="text-white">2 000+</strong> créateurs{" "}
              <span className="text-accent">★★★★★</span>
            </p>
          </div>
        </div>

        <div className="relative flex justify-center gap-3 lg:justify-end">
          {PREVIEW_CARDS.map((card, i) => (
            <div
              key={i}
              className={`relative w-28 sm:w-32 ${card.rotate} ${card.z} ${i === 1 ? "mt-8" : ""}`}
            >
              <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-bg-hover to-bg-card">
                <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center">
                  <span className="text-4xl">{["🍄", "🍌", "🍓"][i]}</span>
                  <span className="text-[10px] text-text-muted">Preview vidéo</span>
                </div>
              </div>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-black">
                {card.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
