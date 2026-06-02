import Link from "next/link";
import {
  formatPlanPrice,
  getMarketingPlans,
  pubCreditTotal,
} from "@/lib/plans";

export function PricingSection() {
  const plans = getMarketingPlans();

  return (
    <section id="tarifs" className="landing-section">
      <div className="landing-section-inner" style={{ textAlign: "center" }}>
        <h2 className="landing-h2">Tarifs</h2>
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            color: "#a89a8e",
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
          }}
        >
          1 pub complète = {pubCreditTotal(1)} crédits (1 scène) ·{" "}
          {pubCreditTotal(2)} crédits (2 scènes) · {pubCreditTotal(3)} crédits (3
          scènes)
        </p>

        <div className="landing-tarifs-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card-base landing-plan-card${
                plan.popular ? " landing-plan-featured" : ""
              }`}
              style={{ padding: 24, textAlign: "left" }}
            >
              {plan.popular && (
                <span className="landing-plan-tag">Populaire</span>
              )}
              <h3 style={{ fontWeight: 600, color: "#fff8f2" }}>{plan.name}</h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#e32b45",
                }}
              >
                {formatPlanPrice(plan.price)}
              </p>
              {plan.price > 0 && (
                <p style={{ fontSize: 13, color: "#7a6f64" }}>/mois</p>
              )}
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ff6fae",
                }}
              >
                {plan.credits} crédits · {plan.description}
              </p>
              <ul
                style={{
                  marginTop: 14,
                  listStyle: "none",
                  padding: 0,
                  fontSize: 13,
                  color: "#c4b5a8",
                  lineHeight: 1.75,
                }}
              >
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#e32b45", flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
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
  );
}
