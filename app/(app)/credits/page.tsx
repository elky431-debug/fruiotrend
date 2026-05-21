import Link from "next/link";
import { Button } from "@/components/ui/Button";

const PLANS = [
  {
    name: "Gratuit",
    price: "0€",
    credits: "3 crédits",
    duration: "18s / 24s / 30s",
    model: "Standard",
    cta: "Plan actuel",
    highlight: false,
  },
  {
    name: "Starter",
    price: "9,99€",
    credits: "30 crédits/mois",
    duration: "Jusqu'à 72s",
    model: "HD · Nano Banana 2",
    cta: "Choisir Starter",
    highlight: true,
  },
  {
    name: "Pro",
    price: "29,99€",
    credits: "Illimité",
    duration: "Jusqu'à 120s",
    model: "Ultra · Nano Banana Pro",
    cta: "Choisir Pro",
    highlight: false,
  },
];

export default function CreditsPage() {
  return (
    <div className="app-page">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>
          Crédits & Plans
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>
        Tu as <strong style={{ color: "#C8FF00" }}>3 crédits</strong> restants
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`card-base flex flex-col p-6 ${
              plan.highlight ? "border-accent ring-1 ring-accent" : ""
            }`}
          >
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-3xl font-extrabold text-accent">{plan.price}</p>
            <p className="text-sm text-text-muted">/mois</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-text-secondary">
              <li>✓ {plan.credits}</li>
              <li>✓ {plan.duration}</li>
              <li>✓ {plan.model}</li>
              <li>✓ Format 9:16</li>
            </ul>
            <Button
              variant={plan.highlight ? "primary" : "secondary"}
              fullWidth
              className="mt-6"
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-text-muted">
        Paiement sécurisé via Stripe ·{" "}
        <Link href="/settings" className="text-accent hover:underline">
          Gérer l&apos;abonnement
        </Link>
      </p>
    </div>
  );
}
