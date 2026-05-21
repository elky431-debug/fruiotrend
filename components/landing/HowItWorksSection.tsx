import Link from "next/link";

const STEPS = [
  {
    step: "ÉTAPE 1",
    title: "Écris ton prompt / Idée",
    desc: "Décris ton concept en quelques mots. L'IA génère automatiquement un script dramatique complet avec dialogues et rebondissements.",
    emoji: "✍️",
  },
  {
    step: "ÉTAPE 2",
    title: "L'IA génère script & images",
    desc: "Script et images sont générés automatiquement. Chaque scène est modifiable avant la génération de la vidéo si tu le souhaites.",
    emoji: "🎬",
  },
  {
    step: "ÉTAPE 3",
    title: "Génère ta vidéo et poste-la",
    desc: "Génère la vidéo en un clic et poste-la directement sur TikTok, Reels et Shorts. Format 9:16, audio intégré, prêt à publier.",
    emoji: "📱",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-bg-subtle py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-3xl font-extrabold lg:text-4xl">
          Crée des vidéos IA{" "}
          <span className="text-accent">pour toutes les niches</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
          Crée des vidéos IA de qualité pour toutes les niches, prêtes à être postées sur
          TikTok, Reels et Shorts.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="card-base overflow-hidden text-left">
              <div className="flex h-48 items-center justify-center bg-bg-hover text-6xl">
                {s.emoji}
              </div>
              <div className="p-6">
                <p className="text-sm font-bold text-accent">{s.step}</p>
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
