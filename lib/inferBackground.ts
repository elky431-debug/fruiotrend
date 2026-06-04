/** Décor contextuel par défaut si GPT n'a pas fourni scene.background */
export function inferBackground(productDescription: string): string {
  const desc = (productDescription || "").toLowerCase();

  if (desc.match(/massage|muscle|sport|récupér|fitness|gym|entraîn|padel|tennis|course/)) {
    return "Professional gym interior, rubber flooring, blue LED strip lights along walls, weights and dumbbells in soft bokeh background, dramatic athletic side lighting, energetic atmosphere";
  }
  if (desc.match(/crème|soin|peau|visage|beauté|collagène|anti-âge|ride|beauty|skincare/)) {
    return "Elegant marble bathroom vanity, warm glowing mirror lights, fresh pink roses in vase, white scented candles, luxury spa atmosphere, soft flattering light";
  }
  if (desc.match(/tech|gadget|électronique|gaming|jeu|ordinateur|phone|tel|app|appli|software/)) {
    return "Modern dark desk setup with RGB purple and blue lighting, ultra-wide monitor in background, clean minimal workspace, tech premium atmosphere";
  }
  if (desc.match(/cuisine|food|alimenta|nutri|manger|cuire|repas|kitchen|cook/)) {
    return "Bright modern kitchen, white marble countertop, fresh colorful vegetables, warm natural light from large window, clean and appetizing atmosphere";
  }
  if (desc.match(/mode|vêtement|sac|bijou|accessoire|luxe|parfum|fashion|jewelry/)) {
    return "Luxury fashion boutique interior, soft spotlight from above, clean white marble floor, gold rack displays in background, elegant and aspirational";
  }
  if (desc.match(/sommeil|dormir|nuit|repos|relaxa|stress|anxié|sleep|wellness|bien-être/)) {
    return "Cozy bedroom at night, warm bedside lamp creating soft glow, white fluffy pillows and duvet, peaceful and calming atmosphere, bokeh fairy lights";
  }
  if (desc.match(/bébé|enfant|jouet|kid|parent|toy|children/)) {
    return "Bright colorful playroom, pastel colored walls, soft play mat, natural daylight from window, happy and safe family atmosphere";
  }
  if (desc.match(/jardin|plante|nature|outdoor|extérieur|garden|plant/)) {
    return "Beautiful garden in golden hour light, green lush plants, warm sunset bokeh, natural and fresh outdoor atmosphere";
  }
  if (desc.match(/santé|douleur|lombaire|dos|articul|health|pain|medical/)) {
    return "Calm wellness therapy room, soft warm lighting, clean minimalist decor, comfortable ergonomic setting, soothing professional atmosphere";
  }

  return "Modern bright interior space, warm natural lighting from large windows, clean minimal decor with plants, aspirational lifestyle atmosphere";
}

const GENERIC_BACKGROUND =
  /living room|salon|fond blanc|fond neutre|white background|grey background|gray background|neutral background|plain background|studio backdrop|studio background|generic interior|empty room|blank background|white studio|grey studio|gray studio|beige wall|neutral decor/i;

/** True si le décor GPT est trop générique → on infère depuis le produit. */
export function isGenericBackground(background?: string | null): boolean {
  if (!background?.trim()) return true;
  const bg = background.trim();
  if (bg.length < 40) return true;
  return GENERIC_BACKGROUND.test(bg);
}

/** Background final : scène GPT si précis, sinon inféré du produit. */
export function resolveSceneBackground(
  sceneBackground: string | undefined | null,
  productDescription: string
): string {
  const trimmed = sceneBackground?.trim();
  if (trimmed && !isGenericBackground(trimmed)) return trimmed;
  return inferBackground(productDescription);
}
