import { FAQSection } from "@/components/landing/FAQSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { Navbar } from "@/components/landing/Navbar";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import Link from "next/link";
import "./landing.css";

export default function HomePage() {
  return (
    <div className="landing-root">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <SocialProofSection />
      <TestimonialsSection />

      <section id="tarifs" className="landing-section">
        <div className="landing-section-inner" style={{ textAlign: "center" }}>
          <h2 className="landing-h2">Tarifs</h2>
          <div className="landing-tarifs-grid">
            {[
              { name: "Gratuit", price: "0€", credits: "3 crédits", scenes: "3 scènes test", tag: "" },
              { name: "Starter", price: "9,99€", credits: "30 crédits/mois", scenes: "Pubs HD 9:16", tag: "Populaire" },
              { name: "Pro", price: "29,99€", credits: "Illimité", scenes: "Priorité + export", tag: "" },
            ].map((plan) => (
              <div
                key={plan.name}
                className="card-base"
                style={{
                  padding: 24,
                  border: plan.tag
                    ? "1px solid rgba(227, 43, 69, 0.5)"
                    : undefined,
                }}
              >
                {plan.tag && (
                  <span
                    style={{
                      display: "inline-block",
                      marginBottom: 8,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: "rgba(227, 43, 69, 0.2)",
                      color: "#e32b45",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {plan.tag}
                  </span>
                )}
                <h3 style={{ fontWeight: 600, color: "#fff8f2" }}>{plan.name}</h3>
                <p style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#e32b45" }}>
                  {plan.price}
                </p>
                <p style={{ fontSize: 13, color: "#7a6f64" }}>/mois</p>
                <ul
                  style={{
                    marginTop: 16,
                    listStyle: "none",
                    fontSize: 14,
                    color: "#c4b5a8",
                    lineHeight: 1.8,
                  }}
                >
                  <li>✓ {plan.credits}</li>
                  <li>✓ {plan.scenes}</li>
                  <li>✓ Format 9:16</li>
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/plans" className="btn-primary inline-flex">
              Voir tous les plans →
            </Link>
          </div>
        </div>
      </section>

      <FAQSection />

      <footer
        style={{
          borderTop: "1px solid rgba(245, 182, 67, 0.12)",
          padding: "2rem 1rem",
          textAlign: "center",
          fontSize: 13,
          color: "#7a6f64",
        }}
      >
        AdCreative.io — 2026
      </footer>
    </div>
  );
}
