import Image from "next/image";
import Link from "next/link";

const STEPS = [
  {
    step: "ÉTAPE 1",
    title: "Écris ton prompt / Idée",
    desc: "Décris ton concept en quelques mots. L'IA génère automatiquement un script dramatique complet avec dialogues et rebondissements.",
    image: "/landing/drama-cuisine.png",
    alt: "Exemple drama cuisine",
  },
  {
    step: "ÉTAPE 2",
    title: "L'IA génère script & images",
    desc: "Character sheets + scènes 9:16 en style Pixar 3D. Personnages cohérents, émotions maximales.",
    image: "/landing/drama-chantier.png",
    alt: "Exemple drama chantier",
  },
  {
    step: "ÉTAPE 3",
    title: "Génère ta vidéo et poste-la",
    desc: "Animation et export TikTok/Reels. Format 9:16, prêt à publier.",
    image: "/landing/drama-rue.png",
    alt: "Exemple golden hour rue",
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-y border-border bg-bg-subtle py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-extrabold lg:text-4xl">
          Crée des vidéos IA{" "}
          <span className="text-gradient">pour toutes les niches</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
          Drama cuisine, telenovela de bureau, romance en ville — le style viral
          fruit, automatisé.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="card-base overflow-hidden text-left transition hover:border-accent-warm/30"
            >
              <div className="relative aspect-[9/16] max-h-64 overflow-hidden bg-bg-hover">
                <Image
                  src={s.image}
                  alt={s.alt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <p className="text-sm font-bold text-accent-warm">{s.step}</p>
                <h3 className="mt-2 text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/generate" className="btn-primary mt-12 inline-flex">
          Commencer maintenant →
        </Link>
      </div>
    </section>
  );
}
