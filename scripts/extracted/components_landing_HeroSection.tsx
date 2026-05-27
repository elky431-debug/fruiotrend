import Image from "next/image";
import Link from "next/link";

const PREVIEW_CARDS = [
  {
    badge: "DRAMA VIRAL",
    rotate: "-rotate-3",
    z: "z-10",
    src: "/landing/drama-cuisine.png",
    alt: "Famille fraise — drama cuisine",
  },
  {
    badge: "TELENOVELA",
    rotate: "rotate-2",
    z: "z-20",
    src: "/landing/drama-chantier.png",
    alt: "Cerise vs banane — chantier",
  },
  {
    badge: "GOLDEN HOUR",
    rotate: "-rotate-1",
    z: "z-30",
    src: "/landing/drama-rue.png",
    alt: "Fraise et banane en ville",
  },
];

export function HeroSection() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-16 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="badge-accent badge">
            🍓 Générateur fruit drama #1
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-tight lg:text-6xl">
            Crée des vidéos de
            <br />
            <span className="text-gradient">Fruits IA</span>
            <br />
            en 5 minutes
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary">
            Style Pixar 3D, intrigue de telenovela, format TikTok. Script, images
            et animation — tout en un.
          </p>

          <Link
            href="/generate"
            className="btn-primary mt-8 inline-flex px-8 py-4 text-lg"
          >
            Commencer maintenant →
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["🍓", "🍌", "🍒"].map((e, i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg-primary bg-bg-card text-sm shadow-golden"
                >
                  {e}
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              Rejoint par <strong className="text-white">2 000+</strong> créateurs{" "}
              <span className="text-accent-warm">★★★★★</span>
            </p>
          </div>
        </div>

        <div className="relative flex justify-center gap-3 lg:justify-end">
          {PREVIEW_CARDS.map((card, i) => (
            <div
              key={card.src}
              className={`relative w-28 sm:w-36 ${card.rotate} ${card.z} ${i === 1 ? "mt-10" : ""}`}
            >
              <div className="glow-accent aspect-[9/16] overflow-hidden rounded-2xl border-2 border-accent-warm/30 shadow-golden">
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={360}
                  height={640}
                  className="h-full w-full object-cover"
                  priority={i === 1}
                />
              </div>
              <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-accent to-accent-warm px-2.5 py-0.5 text-[9px] font-bold text-white shadow-accent">
                {card.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
