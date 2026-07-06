/**
 * Thèmes d'animation pour l'onglet « Animer ».
 *
 * Chaque thème définit une direction artistique (mouvement caméra, lumière,
 * rythme) appliquée à une image uploadée. L'IA analyse d'abord l'image pour en
 * déduire une animation « logique » (cf. lib/animateAnalysis.ts), puis on
 * enveloppe cette description avec la signature visuelle du thème ci-dessous.
 */

export type AnimateTheme = {
  id: string;
  name: string;
  emoji: string;
  /** Description courte affichée dans l'UI. */
  description: string;
  /** Directive artistique (anglais) injectée dans le prompt vidéo. */
  style: string;
  /** Indice donné au modèle de vision pour proposer un mouvement cohérent. */
  motionHint: string;
};

export const ANIMATE_THEMES = {
  product_drop: {
    id: "product_drop",
    name: "Produit Drop",
    emoji: "🚀",
    description: "Mise en avant e-commerce dynamique, style pub dropshipping TikTok.",
    style:
      "High-energy dropshipping product ad. The product is the hero: it hovers and rotates slowly in place with a punchy, confident vibe. Dramatic studio lighting, bold contrast, subtle glow and light rays sweeping across the product, clean gradient background, premium reflections. Snappy modern commercial feel, vertical 9:16.",
    motionHint:
      "a satisfying product-reveal motion that makes the item look desirable (gentle float, slow rotation, light glint)",
  },
  saas_pro: {
    id: "saas_pro",
    name: "SaaS Pro",
    emoji: "💻",
    description: "Rendu tech épuré et pro pour app, dashboard ou capture d'écran.",
    style:
      "Sleek modern SaaS / tech product ad. Smooth, elegant parallax and subtle floating motion on the interface or device. Clean minimal aesthetic, soft gradient background (deep blue / violet), crisp UI, gentle depth-of-field, refined highlight sweeps. Professional, trustworthy, high-tech mood, vertical 9:16.",
    motionHint:
      "smooth professional motion (subtle parallax, floating UI panels, soft light sweep) that feels premium and calm",
  },
  luxe: {
    id: "luxe",
    name: "Luxe Premium",
    emoji: "💎",
    description: "Ambiance haut de gamme, cinématique et élégante, slow motion.",
    style:
      "Luxury premium ad. Elegant cinematic slow-motion, refined and sophisticated. Rich moody lighting with soft golden or silver highlights, deep shadows, glossy reflections, minimalist upscale background. Slow graceful camera drift and delicate glints. High-end fashion / jewelry commercial mood, vertical 9:16.",
    motionHint:
      "graceful slow-motion elegance (delicate drift, shimmering highlights) that conveys premium quality",
  },
  food: {
    id: "food",
    name: "Food & Gourmand",
    emoji: "🍔",
    description: "Rendu appétissant : fraîcheur, vapeur, texture, gros plan.",
    style:
      "Mouth-watering food commercial. Appetizing macro feel with fresh, vivid colors, glistening textures, rising steam or subtle droplets, warm inviting lighting. Gentle appetizing motion that highlights freshness and texture. Premium food-ad look, vertical 9:16.",
    motionHint:
      "appetizing motion (rising steam, glistening freshness, subtle bounce) that makes the food irresistible",
  },
  mode: {
    id: "mode",
    name: "Mode & Lifestyle",
    emoji: "🧥",
    description: "Éditorial mode stylé, mouvement fluide et tendance.",
    style:
      "Trendy fashion / lifestyle ad. Stylish editorial motion, confident and fluid, modern color grade, soft natural light with tasteful highlights, aspirational vibe. Smooth flattering movement that showcases style and texture. Instagram / TikTok fashion mood, vertical 9:16.",
    motionHint:
      "stylish fluid motion (flattering drift, fabric or hair subtly moving) with an aspirational editorial vibe",
  },
  tech: {
    id: "tech",
    name: "Tech Gadget",
    emoji: "⚡",
    description: "Reveal futuriste, néons et énergie hi-tech.",
    style:
      "Futuristic tech gadget ad. Hi-tech reveal energy: sleek neon accents, glowing edges, sharp reflections, dark high-contrast background with electric blue / cyan light. Confident precise motion, subtle rotation and energetic light pulses. Cutting-edge gadget commercial mood, vertical 9:16.",
    motionHint:
      "energetic hi-tech reveal (precise rotation, glowing pulses, light streaks) that feels cutting-edge",
  },
} as const;

export type AnimateThemeId = keyof typeof ANIMATE_THEMES;

export function getAnimateTheme(id: string): AnimateTheme | null {
  return (ANIMATE_THEMES as Record<string, AnimateTheme>)[id] ?? null;
}

export function listAnimateThemes(): AnimateTheme[] {
  return Object.values(ANIMATE_THEMES);
}

/** Règles anti-déformation communes (l'image ne doit pas muter). */
const INTEGRITY_RULES = `

INTEGRITY RULES:
- Keep the subject 100% identical to the input image: same shape, colors, text, logos and proportions.
- Do NOT add, remove, duplicate or morph any part of the subject.
- Only animate motion/lighting — never redraw the subject.
- No text overlays, no captions, no watermarks.
- No background music, silence only.`;

/**
 * Construit le prompt vidéo final à partir du thème et de la description
 * (mouvement logique) déduite de l'image par l'IA.
 */
export function buildAnimatePrompt(
  theme: AnimateTheme,
  subjectMotion: string,
  userPrompt?: string
): string {
  const motion =
    subjectMotion?.trim() ||
    "the subject animated with subtle, natural, in-place motion";
  const request = userPrompt?.trim();
  const userDirective = request
    ? `\n\nUSER REQUEST (highest priority, follow this exactly): ${request}`
    : "";
  return `${theme.style}\n\nSCENE: ${motion}${userDirective}${INTEGRITY_RULES}`;
}
