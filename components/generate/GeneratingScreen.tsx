"use client";

interface GeneratingScreenProps {
  progress: number;
  steps: { label: string; done: boolean; active: boolean }[];
}

export function GeneratingScreen({ progress, steps }: GeneratingScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="animate-pulse text-6xl">🍓</div>
      <h2 className="mt-6 text-2xl font-bold text-white">Génération en cours...</h2>

      <ul className="mt-10 w-full max-w-md space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className={step.done ? "text-accent" : step.active ? "text-white" : "text-text-muted"}>
              {step.done ? "✅" : step.active ? "⏳" : "○"}
            </span>
            <span
              className={
                step.done
                  ? "text-text-secondary line-through"
                  : step.active
                    ? "text-white"
                    : "text-text-muted"
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 h-2 w-full max-w-md overflow-hidden rounded-full bg-bg-card">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-6 text-sm text-text-secondary">
        ⚡ Cela prend généralement 2 à 5 minutes
      </p>
    </div>
  );
}
