interface StepProgressProps {
  current: 1 | 2 | 3 | 4;
}

export function StepProgress({ current }: StepProgressProps) {
  return (
    <div className="flex gap-2 px-4 py-4 md:px-8">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            step <= current ? "bg-accent" : "bg-border"
          } ${step === current ? "animate-pulse" : ""}`}
        />
      ))}
    </div>
  );
}
