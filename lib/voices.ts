import type { ProductInput } from "@/types/ad";

export type VoiceOption = {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  description: string;
  emoji: string;
  tags: string[];
};

/** Voix Grok TTS Aurora (xAI) */
export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "eve",
    name: "Eve",
    gender: "female",
    description: "Douce & naturelle",
    emoji: "👩",
    tags: ["beauté", "lifestyle"],
  },
  {
    id: "aria",
    name: "Aria",
    gender: "female",
    description: "Claire & dynamique",
    emoji: "✨",
    tags: ["sport", "mode"],
  },
  {
    id: "luna",
    name: "Luna",
    gender: "female",
    description: "Chaleureuse & posée",
    emoji: "🌸",
    tags: ["luxe", "bien-être"],
  },
  {
    id: "nova",
    name: "Nova",
    gender: "female",
    description: "Énergique & moderne",
    emoji: "💁‍♀️",
    tags: ["tech", "gadgets"],
  },
  {
    id: "leo",
    name: "Leo",
    gender: "male",
    description: "Jeune & dynamique",
    emoji: "🧑",
    tags: ["sport", "gaming"],
  },
  {
    id: "rex",
    name: "Rex",
    gender: "male",
    description: "Grave & autoritaire",
    emoji: "💪",
    tags: ["sport", "fitness"],
  },
  {
    id: "atlas",
    name: "Atlas",
    gender: "male",
    description: "Profond & premium",
    emoji: "🎭",
    tags: ["luxe", "tech"],
  },
  {
    id: "orion",
    name: "Orion",
    gender: "male",
    description: "Posé & professionnel",
    emoji: "🎙️",
    tags: ["business", "démo"],
  },
];

/** Indication de timbre pour le prompt LTX (audio intégré à la vidéo) */
const LTX_VOICE_STYLE_HINTS: Record<string, string> = {
  eve: "warm natural female",
  aria: "clear dynamic female",
  luna: "soft warm female",
  nova: "energetic modern female",
  leo: "young dynamic male",
  rex: "deep authoritative male",
  atlas: "deep premium male",
  orion: "calm professional male",
};

export function normalizeVoiceId(voiceName?: string): string | null {
  if (!voiceName) return null;
  const id = voiceName.trim().toLowerCase();
  const hit = VOICE_OPTIONS.find((v) => v.id === id);
  return hit?.id ?? null;
}

export const VOICE_IDS = new Set(VOICE_OPTIONS.map((v) => v.id));

export const DEMO_TEXT: Record<string, string> = {
  beaute: "Ta peau mérite mieux. Je la transforme en 30 jours.",
  sport: "Tes muscles me connaissent déjà. Je soulage tout.",
  tech: "La technologie qui change ton quotidien. C'est moi.",
  default: "Je suis là pour toi. Essaie-moi maintenant.",
};

export function resolveVoiceDemoCategory(product: ProductInput): string {
  const audience = product.targetAudience.toLowerCase();
  if (
    /sport|fitness|gaming|gamer/i.test(audience) ||
    product.template === "product_demo"
  ) {
    return "sport";
  }
  if (/tech|entrepreneur|gadget/i.test(audience)) {
    return "tech";
  }
  if (
    /femme|beaut|mode|lifestyle|parent/i.test(audience) ||
    ["living_product", "influencer"].includes(product.template)
  ) {
    return "beaute";
  }
  return "default";
}

export function isValidVoiceId(voiceName: string | undefined): boolean {
  return normalizeVoiceId(voiceName) !== null;
}

export function buildLtxVoiceStyleHint(voiceName?: string): string {
  const id = normalizeVoiceId(voiceName) || "eve";
  return LTX_VOICE_STYLE_HINTS[id] || "warm natural";
}

export function defaultVoiceForProduct(
  productCategory?: string,
  gender?: string
): string {
  if (gender === "male") return "rex";
  if (productCategory === "sport" || productCategory === "tech") {
    return gender === "male" ? "atlas" : "aria";
  }
  return "eve";
}
