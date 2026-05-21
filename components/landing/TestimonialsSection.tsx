const TESTIMONIALS = [
  {
    handle: "@zinzinstoriesfr",
    quote:
      "Avant je galérais entre 6 logiciels à la fois, ça me coûtait grave cher. Maintenant 1 prompt suffit.",
    preview: "Fait avec FruitDrama.io",
    stats: "80,6K likes · 360 comments",
  },
  {
    handle: "@dr.skelix",
    quote:
      "Ultra simple à faire, je poste tous les jours sans avoir besoin d'être monteur pro.",
    preview: "La mangue à la tache de naissance partie 11",
    stats: "",
  },
  {
    handle: "@hamuyama_lab",
    quote:
      "Mes personnages cerises restent identiques d'épisode en épisode, sans setup compliqué.",
    preview: "VITE CERISIA",
    stats: "",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.handle} className="rounded-2xl border border-border bg-bg-secondary p-6">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-bg-card" />
                <span className="font-medium text-white">{t.handle}</span>
              </div>
              <p className="mt-4 text-sm text-text-secondary">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 aspect-[9/16] max-h-48 overflow-hidden rounded-xl bg-bg-card">
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs font-bold text-accent">{t.preview}</p>
                  {t.stats && (
                    <p className="mt-2 text-[10px] text-text-muted">{t.stats}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
