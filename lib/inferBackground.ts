export type ProductCategory =
  | "fitness"
  | "beauty"
  | "tech"
  | "food"
  | "fashion"
  | "sleep"
  | "kids"
  | "garden"
  | "health";

const CATEGORY_BACKGROUNDS: Record<ProductCategory, string> = {
  fitness:
    "Professional gym interior, rubber flooring, blue LED strip lights along walls, weights and dumbbells in soft bokeh background, dramatic athletic side lighting, energetic atmosphere",
  beauty:
    "Elegant marble bathroom vanity, warm glowing mirror lights, fresh pink roses in vase, white scented candles, luxury spa atmosphere, soft flattering light",
  tech:
    "Modern dark desk setup with RGB purple and blue lighting, ultra-wide monitor in background, clean minimal workspace, tech premium atmosphere",
  food:
    "Bright modern kitchen, white marble countertop, fresh colorful vegetables, warm natural light from large window, clean and appetizing atmosphere",
  fashion:
    "Luxury fashion boutique interior, soft spotlight from above, clean white marble floor, gold rack displays in background, elegant and aspirational",
  sleep:
    "Cozy bedroom at night, warm bedside lamp creating soft glow, white fluffy pillows and duvet, peaceful and calming atmosphere, bokeh fairy lights",
  kids:
    "Bright colorful playroom, pastel colored walls, soft play mat, natural daylight from window, happy and safe family atmosphere",
  garden:
    "Beautiful garden in golden hour light, green lush plants, warm sunset bokeh, natural and fresh outdoor atmosphere",
  health:
    "Calm wellness therapy room, soft warm lighting, clean minimalist decor, massage table and recovery equipment in soft bokeh, soothing professional atmosphere",
};

const GENERIC_BACKGROUND =
  /living room|living space|salon|sofa|couch|canapé|canape|coffee table|table basse|fiddle leaf|home interior|apartment living|domestic interior|residential living|cozy home|comfortable seating|indoor plants near window|fond blanc|fond neutre|white background|grey background|gray background|neutral background|plain background|studio backdrop|studio background|generic interior|empty room|blank background|white studio|grey studio|gray studio|beige wall|neutral decor|modern bright interior|warm natural lighting from large windows|clean minimal decor with plants|aspirational lifestyle atmosphere|lifestyle atmosphere|bright modern home|contemporary home|seating area with/i;

const HOME_DECOR_SIGNALS =
  /living room|living space|salon|sofa|couch|canapé|canape|coffee table|home interior|apartment|domestic|residential|fiddle leaf|comfortable seating|cozy home|modern bright interior|warm natural lighting from large windows|clean minimal decor with plants|aspirational lifestyle/i;

const CATEGORY_PATTERNS: Array<{ category: ProductCategory; re: RegExp }> = [
  {
    category: "fitness",
    re: /massage|muscle|muscular|sport|récupér|recuper|recovery|fitness|gym|entraîn|entrain|padel|tennis|course|percussion|fascia|pistolet|deep tissue|athletic|workout|dumbbell|barbell|foam roll|theragun|hypervolt|gun-shaped|t-shaped.*gun|massage gun/i,
  },
  {
    category: "beauty",
    re: /crème|creme|soin|peau|visage|beauté|beaute|collagène|collagene|anti-âge|anti-age|ride|beauty|skincare|serum|makeup|maquillage|lipstick|rouge à lèvres/i,
  },
  {
    category: "tech",
    re: /tech|gadget|électronique|electronique|gaming|jeu|ordinateur|phone|tel|app|appli|software|keyboard|clavier|écouteur|ecouteur|headphone|smartwatch|console/i,
  },
  {
    category: "food",
    re: /cuisine|food|alimenta|nutri|manger|cuire|repas|kitchen|cook|recipe|recette|supplement|complément/i,
  },
  {
    category: "fashion",
    re: /mode|vêtement|vetement|sac|bijou|accessoire|luxe|parfum|fashion|jewelry|watch|montre|sneaker|chaussure(?!.*sport)/i,
  },
  {
    category: "sleep",
    re: /sommeil|dormir|nuit|repos|relaxa|stress|anxié|anxie|sleep|wellness pillow|oreiller|matelas(?!.*sport)/i,
  },
  {
    category: "kids",
    re: /bébé|bebe|enfant|jouet|kid|parent|toy|children|nursery/i,
  },
  {
    category: "garden",
    re: /jardin|plante|nature|outdoor|extérieur|exterieur|garden|plant(?!.*based food)/i,
  },
  {
    category: "health",
    re: /santé|sante|douleur|lombaire|dos|articul|health|pain|medical|physio|therapy|thérapie|therapie|chiropract|orthop/i,
  },
];

/** Texte combiné nom + description + analyse vision pour inférer le décor. */
export function buildProductContextForBackground(parts: {
  name?: string;
  description?: string;
  analysis?: string;
}): string {
  return [parts.name, parts.description, parts.analysis]
    .filter((s) => s?.trim())
    .join(" ")
    .trim();
}

export function inferProductCategory(productContext: string): ProductCategory | null {
  const text = (productContext || "").toLowerCase();
  if (!text) return null;
  for (const { category, re } of CATEGORY_PATTERNS) {
    if (re.test(text)) return category;
  }
  return null;
}

/** True si le décor GPT est trop générique → on infère depuis le produit. */
export function isGenericBackground(background?: string | null): boolean {
  if (!background?.trim()) return true;
  const bg = background.trim();
  if (bg.length < 40) return true;
  return GENERIC_BACKGROUND.test(bg);
}

/** Salon / maison alors que le produit est sport, santé, tech, etc. */
export function isHomeDecorMismatch(
  background: string,
  productContext: string
): boolean {
  if (!HOME_DECOR_SIGNALS.test(background)) return false;
  const category = inferProductCategory(productContext);
  if (!category) return true;
  return category !== "sleep" && category !== "kids";
}

/** Background final : scène GPT si précis ET cohérent, sinon inféré du produit. */
export function resolveSceneBackground(
  sceneBackground: string | undefined | null,
  productContext: string
): string {
  const trimmed = sceneBackground?.trim();
  const category = inferProductCategory(productContext);

  if (trimmed && !isGenericBackground(trimmed) && !isHomeDecorMismatch(trimmed, productContext)) {
    return trimmed;
  }

  if (category) return CATEGORY_BACKGROUNDS[category];

  return inferBackground(productContext);
}

/** Décor contextuel par défaut si aucune catégorie détectée. */
export function inferBackground(productDescription: string): string {
  const category = inferProductCategory(productDescription);
  if (category) return CATEGORY_BACKGROUNDS[category];

  return (
    "Professional product showcase environment matching real-world use of the item — " +
    "athletic recovery studio, spa treatment room, workshop, or retail display as appropriate. " +
    "NO residential living room, NO sofa, NO generic home plants-and-couch decor."
  );
}

/** Retire les mentions de salon/maison qui contredisent le décor imposé. */
export function sanitizeSceneDescription(
  sceneDesc: string,
  background: string
): string {
  if (!sceneDesc?.trim()) return sceneDesc;
  if (!HOME_DECOR_SIGNALS.test(sceneDesc) && !HOME_DECOR_SIGNALS.test(background)) {
    return sceneDesc;
  }
  let out = sceneDesc
    .replace(
      /\b(in|inside|within)\s+(a\s+)?(bright\s+)?(modern\s+)?(cozy\s+)?(living\s+room|home\s+interior|salon|apartment|domestic\s+setting)[^.]*\.?/gi,
      ""
    )
    .replace(/\b(on|at)\s+(the\s+)?(sofa|couch|coffee\s+table)[^.]*\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!out) return sceneDesc;
  return out;
}
