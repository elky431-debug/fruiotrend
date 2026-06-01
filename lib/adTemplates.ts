import type { AdTemplate, AdTemplateConfig } from "@/types/ad";

export const AD_TEMPLATES: AdTemplateConfig[] = [
  {
    id: "living_product",
    name: "Produit Vivant",
    emoji: "🧸",
    description:
      "Ton produit devient un personnage cartoon qui parle et se présente lui-même",
    bestFor: ["accessoires", "nourriture", "gadgets", "vêtements", "chaussures"],
    scenes: 3,
    hook_style: "Le produit s'anime soudainement et interpelle le spectateur",
  },
  {
    id: "influencer",
    name: "Influenceur Cartoon",
    emoji: "🧑",
    description:
      "Un personnage cartoon tient ton produit et en parle directement à la caméra",
    bestFor: ["beauté", "fitness", "tech", "lifestyle", "mode"],
    scenes: 3,
    hook_style: 'L\'influenceur interpelle directement : "Tu DOIS voir ça"',
  },
  {
    id: "product_demo",
    name: "Démo Produit",
    emoji: "🔬",
    description:
      "Présentation cinématographique du produit avec effets visuels style Apple",
    bestFor: ["tech", "gadgets", "électronique", "outils", "sport"],
    scenes: 3,
    hook_style: "Révélation du produit en gros plan avec musique épique",
  },
];

export const TEMPLATE_SYSTEM_PROMPTS: Record<AdTemplate, string> = {
  living_product: `STYLE EXACT : Le produit lui-même prend vie (style Pixar Cars — yeux + bouche sur sa surface).

RÈGLES ABSOLUES pour le template Produit Vivant :
1. Le produit GARDE son apparence exacte à 100% (couleurs, packaging, logo, forme)
2. Yeux cartoon expressifs + bouche parlante sur la surface du produit — PAS de bras, PAS de jambes
3. Le produit parle à la 1ère personne via voiceover — bouche animée
4. AUCUN autre personnage avec un visage en arrière-plan — le produit est seul
5. On reconnaît IMMÉDIATEMENT le vrai produit

Dans les gemini_prompt : produit exact + yeux + bouche + décor contextuel, sans personnages parasites.`,

  influencer: `Un influenceur cartoon 3D Pixar (genre/apparence défini par la cible) tient et utilise le produit.
Il parle directement à la caméra comme dans une vraie vidéo UGC mais version cartoon.
Style authentique, ton naturel, comme un vrai témoignage mais en version animée.
SCÈNE 1 : L'influenceur interpelle directement "Stop ! Tu DOIS voir ça" en tenant le produit
SCÈNES 2-3 : Démonstration et bénéfices personnels partagés
SCÈNE FINALE : "Sérieusement, commande maintenant — le lien est en bio"`,

  product_demo: `Style Apple Product Launch — cinématographique, minimal, premium.
Gros plans spectaculaires du produit sous différents angles avec éclairage studio parfait.
Effets visuels qui montrent comment le produit fonctionne (rayon X, particules, coupe).
Musique épique implicite dans les descriptions visuelles.
SCÈNE 1 : Révélation lente et dramatique du produit depuis le noir
SCÈNES 2-3 : Zoom sur les détails et fonctionnalités clés avec effets visuels
SCÈNE FINALE : Produit en pleine lumière + prix/CTA style Apple`,
};

export function isActiveTemplate(id: string): id is AdTemplate {
  return AD_TEMPLATES.some((t) => t.id === id);
}

export function normalizeAdTemplate(id?: string | null): AdTemplate {
  const raw = id ?? "";
  return isActiveTemplate(raw) ? raw : "living_product";
}

export function getTemplateConfig(id: AdTemplate | string): AdTemplateConfig {
  return AD_TEMPLATES.find((t) => t.id === id) ?? AD_TEMPLATES[0];
}

/** Templates où un personnage humain parle (pas le produit vivant) */
export function usesHumanPresenter(template: AdTemplate): boolean {
  return template === "influencer";
}

export function buildScriptVoiceoverRule(
  template: AdTemplate,
  templateLabel: string,
  examplesBlock: string,
  wordsPerScene: number
): string {
  if (template === "influencer") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 2 — VOICEOVER INFLUENCEUR (personnage humain)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Le voiceover est dit PAR l'influenceur cartoon (humain), PAS par le produit.
Ton TikTok/UGC : direct, enthousiaste, tutoiement.
✅ "Ce truc a changé ma vie. Sérieusement."
✅ "Tu dois voir ça. J'en parle à chaque fois."
❌ JAMAIS le produit qui parle à la 1ère personne ("Je suis une ceinture...")
❌ JAMAIS narrateur externe détaché

EXEMPLES (${templateLabel}) :
${examplesBlock}

Chaque voiceover : environ ${wordsPerScene} mots (±6 accepté).`;
  }

  if (template === "product_demo") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 2 — VOICEOVER DÉMO PRODUIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ton premium, cinématographique — comme une keynote Apple.
Voix off qui met en valeur le produit (2e ou 3e personne), pas le produit qui parle.
Pas de visage cartoon sur le produit.

EXEMPLES (${templateLabel}) :
${examplesBlock}

Chaque voiceover : environ ${wordsPerScene} mots (±6 accepté).`;
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 2 — LE PRODUIT PARLE (1ÈRE PERSONNE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ "Je suis là. Chaque soir. Pour toi."
✅ "Tu souffres encore ? Laisse-moi m'en occuper."
❌ JAMAIS "Ce produit va changer votre vie."
❌ JAMAIS de narrateur externe

EXEMPLES (${templateLabel}) :
${examplesBlock}

Chaque voiceover : environ ${wordsPerScene} mots (±6 accepté).`;
}

export function buildScriptJsonFormatHints(
  template: AdTemplate,
  productName: string,
  wordsPerScene: number,
  secondsPerScene: number,
  isLivingProduct: boolean
): string {
  const visualHint = isLivingProduct
    ? "Scène EN ANGLAIS — produit Pixar avec yeux ET bouche expressive + décor"
    : template === "influencer"
      ? "Scène EN ANGLAIS — influenceur Pixar humain tient le produit, regarde la caméra, produit SANS visage"
      : "Scène EN ANGLAIS — gros plan cinématographique du produit seul, éclairage studio premium, SANS visage cartoon";

  const actionHint = isLivingProduct
    ? "Action du produit EN ANGLAIS (sans bras — bouche qui parle)"
    : template === "influencer"
      ? "L'influenceur parle et montre le produit EN ANGLAIS"
      : "Mouvement caméra cinématographique autour du produit EN ANGLAIS";

  const voiceoverHint = isLivingProduct
    ? `Environ ${wordsPerScene} MOTS en français — 1ère personne, dit par le produit`
    : template === "influencer"
      ? `Environ ${wordsPerScene} MOTS en français — dit par l'influenceur (tu/vous), PAS le produit`
      : `Environ ${wordsPerScene} MOTS en français — voix off premium (2e/3e personne)`;

  const characterGemini = isLivingProduct
    ? "Pixar 3D product with expressive eyes and mouth only"
    : template === "influencer"
      ? "Pixar 3D human influencer, energetic, holds product, product has NO face"
      : "Cinematic product hero shot only — no cartoon face on product";

  return `
  "character": {
    "name": "${isLivingProduct ? productName : "Personnage"}",
    "type": "${isLivingProduct ? "le produit lui-même qui prend vie" : template === "influencer" ? "influenceur cartoon UGC" : "personnage cartoon"}",
    "description": "personnalité Pixar",
    "outfit": "tenue lifestyle adaptée à la cible",
    "personality": "direct, chaleureux",
    "gemini_character_prompt": "${characterGemini}"
  },
  "scenes": [
    {
      "visual_description": "${visualHint}",
      "character_action": "${actionHint}",
      "voiceover": "${voiceoverHint}",
`;
}

/** Clés internes pour les prompts Gemini image */
export type ImageTemplateKey =
  | "produit-vivant"
  | "influenceur"
  | "demo-produit";

const IMAGE_TEMPLATE_ALIASES: Record<string, ImageTemplateKey> = {
  living_product: "produit-vivant",
  "living-product": "produit-vivant",
  "produit-vivant": "produit-vivant",
  "produit vivant": "produit-vivant",
  influenceur: "influenceur",
  influencer: "influenceur",
  "influenceur-cartoon": "influenceur",
  "influenceur cartoon": "influenceur",
  before_after: "demo-produit",
  "before-after": "demo-produit",
  "avant-apres": "demo-produit",
  "avant/après": "demo-produit",
  "avant-après": "demo-produit",
  product_demo: "demo-produit",
  "product-demo": "demo-produit",
  "demo-produit": "demo-produit",
  "démo-produit": "demo-produit",
  lifestyle: "influenceur",
  absurd_problem: "produit-vivant",
  "absurd-problem": "produit-vivant",
  "probleme-absurde": "produit-vivant",
  "problème-absurde": "produit-vivant",
  unboxing: "demo-produit",
  "unboxing-premium": "demo-produit",
  testimonial: "influenceur",
  temoignages: "influenceur",
  témoignages: "influenceur",
};

/** Normalise tout id / libellé UI vers une clé prompt image stable */
export function normalizeImageTemplateKey(
  template?: string | null
): ImageTemplateKey {
  const raw = (template ?? "").trim().toLowerCase();
  if (!raw) return "produit-vivant";

  const candidates = [
    raw,
    raw.replace(/[\s_]+/g, "-"),
    raw.replace(/[\s-]+/g, "_"),
  ];

  for (const c of candidates) {
    const hit = IMAGE_TEMPLATE_ALIASES[c];
    if (hit) return hit;
  }

  const byId = AD_TEMPLATES.find(
    (t) =>
      t.id === raw ||
      t.id.replace(/_/g, "-") === raw.replace(/_/g, "-") ||
      t.name.toLowerCase() === raw
  );
  if (byId) {
    return normalizeImageTemplateKey(byId.id);
  }

  return "produit-vivant";
}

export function buildImageTemplatePromptBlock(
  key: ImageTemplateKey,
  productAnalysis: string,
  sceneDesc: string,
  targetAudience?: string
): string {
  const audience = targetAudience?.trim() || "general audience";
  const blocks: Record<ImageTemplateKey, string> = {
    "produit-vivant": `
TEMPLATE — PRODUIT VIVANT (Pixar Cars) :
Le produit prend vie avec des yeux ET une bouche expressifs sur sa surface.
Il est le personnage principal, debout, centré, héroïque.
Aucun autre personnage avec un visage. Le produit EST le héros.
${productAnalysis}`,

    influenceur: `
TEMPLATE — INFLUENCEUR CARTOON (NOT a living product) :
IMPORTANT: HUMAN CHARACTER presents the product — product has NO eyes, NO face.

Create a stylized 3D Pixar human character:
- Young, energetic, relatable (match audience: ${audience})
- Big expressive Pixar eyes, friendly smile, stylized proportions
- Holding the product clearly OR pointing at it enthusiastically
- Product in hands IDENTICAL to reference photos — static prop only
- Character looks DIRECTLY at camera — TikTok/UGC breaking 4th wall
- Casual outfit matching product category
- Lifestyle background (gym, bathroom, kitchen, etc.)

The CHARACTER is the hero. The PRODUCT does not speak visually.
${productAnalysis}`,

    "demo-produit": `
TEMPLATE — DÉMO PRODUIT :
Gros plan cinématographique sur le produit — chaque détail visible.
Éclairage type keynote Apple — propre, premium, dramatique.
Produit IDENTIQUE aux photos, pose de présentation. PAS de visage cartoon sur le produit.
${productAnalysis}`,
  };

  return blocks[key];
}

export function buildImageSubjectPromptBlock(
  key: ImageTemplateKey,
  opts: {
    emotion?: string;
    mouthExpr: string;
    productAnalysis: string;
  }
): string {
  const { emotion, mouthExpr, productAnalysis } = opts;

  if (key === "produit-vivant") {
    return `
━━━ PRODUIT VIVANT — YEUX + BOUCHE ━━━
The product has a face with TWO elements ONLY:
1. LARGE expressive Pixar cartoon eyes — emotion: ${emotion || "excited"}
2. A MOUTH: ${mouthExpr}
Like Pixar Cars — eyes + mouth on the product surface. NO arms, NO legs.
ONLY the product is in the scene — NO other characters with faces in the background.`;
  }

  if (key === "influenceur") {
    return `
━━━ PERSONNAGE PRINCIPAL (INFLUENCEUR) ━━━
Pixar 3D human influencer speaks to camera — energetic, direct eye contact.
Holds the product prominently. Product is a static prop — NO eyes, NO mouth on the product.
NOT Pixar Cars style — this is a human presenter, not a living product.
${productAnalysis}`;
  }

  if (key === "demo-produit") {
    return `
━━━ HÉROS VISUEL : LE PRODUIT SEUL ━━━
Cinematic product hero shot. NO cartoon face on the product — showcase real packaging and form.
${productAnalysis}`;
  }

  return `
━━━ PERSONNAGE + PRODUIT ━━━
Pixar 3D character in scene. Product IDENTICAL to reference photos, clearly visible.
Do NOT add eyes or mouth on the product unless template is living product.
${productAnalysis}`;
}

export function buildScriptVisualPromptExtras(
  template: AdTemplate,
  opts: {
    productName: string;
    productVisualDescription: string;
    background: string;
    mouthExpression: string;
  }
): {
  geminiExtra: string;
  videoExtra: string;
  defaultCharacterAction: string;
} {
  const key = normalizeImageTemplateKey(template);
  const { productName, productVisualDescription, background, mouthExpression } =
    opts;

  if (key === "produit-vivant") {
    const living = `The product ${productName} IS the sole hero with large Pixar eyes AND an expressive speaking mouth on its front surface (no arms, no limbs). Exact shape and colors: ${productVisualDescription}. `;
    return {
      geminiExtra: living,
      videoExtra: living,
      defaultCharacterAction:
        "Product speaks — mouth and eyes animated, no limbs",
    };
  }

  if (key === "influenceur") {
    const block = `Pixar 3D influencer character holds ${productName} and speaks to camera. Product has NO eyes and NO mouth — static prop identical to: ${productVisualDescription}. `;
    return {
      geminiExtra: block,
      videoExtra: block,
      defaultCharacterAction:
        "Influencer gestures and talks to camera while showing the product",
    };
  }

  if (key === "demo-produit") {
    const block = `Cinematic product-only hero shot of ${productName}. NO cartoon face on product. ${productVisualDescription}. `;
    return {
      geminiExtra: block,
      videoExtra: block,
      defaultCharacterAction: "Slow cinematic camera move around the product",
    };
  }

  const generic = `Pixar scene for template ${key}. Product ${productName} identical to: ${productVisualDescription}. Setting: ${background}. Mouth/expression for speaker: ${mouthExpression}. `;
  return {
    geminiExtra: generic,
    videoExtra: generic,
    defaultCharacterAction: "Character interacts with the product naturally",
  };
}
