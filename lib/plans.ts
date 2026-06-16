export const CREDIT_COSTS = {
  script: 1,
  image: 1,
  video: 2,
  voice: 1,
  lipsync: 1,
  regenerate_image: 1,
  regenerate_video: 2,
  creative: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Coût total d'une pub (script + N scènes × image/vidéo/voix/lipsync). */
export function pubCreditTotal(nScenes: number): number {
  const n = Math.min(Math.max(nScenes, 1), 3);
  const perScene =
    CREDIT_COSTS.image +
    CREDIT_COSTS.video +
    CREDIT_COSTS.voice +
    CREDIT_COSTS.lipsync;
  return CREDIT_COSTS.script + n * perScene;
}

/** Coût étape vidéo seule (déjà déduit script + images). */
export function videoStepCreditTotal(nScenes: number): number {
  const n = Math.min(Math.max(nScenes, 1), 3);
  const perScene =
    CREDIT_COSTS.video + CREDIT_COSTS.voice + CREDIT_COSTS.lipsync;
  return n * perScene;
}

export type PlanConfig = {
  id: string;
  name: string;
  price: number;
  credits: number;
  priceId: string;
  description: string;
  popular?: boolean;
  features: string[];
};

/** Price IDs Stripe (catalogue PubMoi) — fallback si env absent au build */
const STRIPE_PRICE_IDS = {
  starter: "price_1TdYrCADfLUEVNSbD8qEa6tU",
  pro: "price_1TdYt2ADfLUEVNSbOZY8WDek",
  business: "price_1TdYu3ADfLUEVNSbnB7zoBuA", // produit Stripe « PubMoi - Max »
} as const;

export const PLANS: Record<"starter" | "pro" | "business", PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 19.99,
    credits: 60,
    priceId:
      process.env.STRIPE_PRICE_STARTER ?? STRIPE_PRICE_IDS.starter,
    description: "~10 pubs / mois",
    features: [
      "60 crédits / mois",
      "~10 pubs complètes (1 scène)",
      "~5 pubs (2 scènes)",
      "Tous les templates",
      "Voix IA + Lip sync inclus",
      "Format 9:16 TikTok/Reels",
      "Téléchargement MP4",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 39.99,
    credits: 200,
    priceId: process.env.STRIPE_PRICE_PRO ?? STRIPE_PRICE_IDS.pro,
    description: "~33 pubs / mois",
    popular: true,
    features: [
      "200 crédits / mois",
      "~33 pubs complètes (1 scène)",
      "~18 pubs (2 scènes)",
      "~12 pubs (3 scènes)",
      "Tout Starter +",
      "Photo influenceur custom",
      "Packaging intégré",
      "Priorité de génération",
    ],
  },
  business: {
    id: "business",
    name: "Max",
    price: 84.99,
    credits: 700,
    priceId:
      process.env.STRIPE_PRICE_BUSINESS ?? STRIPE_PRICE_IDS.business,
    description: "~116 pubs / mois",
    features: [
      "700 crédits / mois",
      "~116 pubs complètes (1 scène)",
      "~63 pubs (2 scènes)",
      "~43 pubs (3 scènes)",
      "Tout Pro +",
      "Support prioritaire",
      "Accès API",
      "Marque blanche",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Plans affichés sur la landing et la page /plans. */
export function getMarketingPlans(): PlanConfig[] {
  return Object.values(PLANS);
}

export function formatPlanPrice(price: number): string {
  if (price === 0) return "0€";
  return `${price.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}€`;
}

export function getPlan(planId: string) {
  return PLANS[planId as PlanId] ?? null;
}
