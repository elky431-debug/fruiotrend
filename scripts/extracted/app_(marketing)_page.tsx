import { FAQSection } from "@/components/landing/FAQSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { Navbar } from "@/components/landing/Navbar";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <SocialProofSection />
      <TestimonialsSection />

      <section id="tarifs" className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-extrabold">Tarifs</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Gratuit", price: "0€", credits: "3 crédits", scenes: "18s · 24s · 30s", tag: "" },
              { name: "Starter", price: "9,99€", credits: "30 crédits/mois", scenes: "Jusqu'à 72s · HD", tag: "Populaire" },
              { name: "Pro", price: "29,99€", credits: "Illimité", scenes: "Jusqu'à 120s · Ultra", tag: "" },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`card-base p-6 ${plan.tag ? "border-accent ring-1 ring-accent" : ""}`}
              >
                {plan.tag && (
                  <span className="mb-2 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                    {plan.tag}
                  </span>
                )}
                <h3 className="font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-accent">{plan.price}</p>
                <p className="text-sm text-text-muted">/mois</p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li>✓ {plan.credits}</li>
                  <li>✓ {plan.scenes}</li>
                  <li>✓ Format 9:16</li>
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/credits" className="btn-primary inline-flex">
              Voir tous les plans →
            </Link>
          </div>
        </div>
      </section>

      <FAQSection />

      <footer className="border-t border-bg-card py-8 text-center text-sm text-text-muted">
        FruitDrama.io — 2026
      </footer>
    </div>
  );
}
