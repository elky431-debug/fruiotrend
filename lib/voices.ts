import type { ProductInput } from "@/types/ad";
import { ELEVENLABS_VOICES, normalizeElevenVoiceId } from "@/lib/elevenlabsVoice";

export type VoiceOption = {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  description: string;
  emoji: string;
  tags: string[];
};

/** Voix ElevenLabs v3 via fal.ai */
export const VOICE_OPTIONS: VoiceOption[] = ELEVENLABS_VOICES.map((v) => ({
  ...v,
  gender: v.gender as VoiceOption["gender"],
}));

export const VOICE_IDS = new Set(VOICE_OPTIONS.map((v) => v.id));

export const DEMO_TEXT: Record<string, string> = {
  beaute:
    "Votre peau mérite le meilleur. Découvrez la différence dès le premier soir.",
  sport: "Récupérez plus vite. Performez mieux. Chaque jour.",
  tech: "La technologie qui change votre quotidien. Simple. Efficace. Maintenant.",
  default:
    "Découvrez ce produit incroyable. Commandez aujourd'hui et transformez votre vie.",
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
    [
      "living_product",
      "influencer",
      "lifestyle",
      "testimonial",
      "unboxing",
    ].includes(product.template)
  ) {
    return "beaute";
  }
  return "default";
}

export function normalizeVoiceId(voiceName?: string): string | null {
  if (!voiceName) return null;
  const normalized = normalizeElevenVoiceId(voiceName);
  return VOICE_IDS.has(normalized) ? normalized : null;
}

export function isValidVoiceId(voiceName: string | undefined): boolean {
  return normalizeVoiceId(voiceName) !== null;
}

export function defaultVoiceForProduct(
  productCategory?: string,
  gender?: string
): string {
  if (gender === "male") return "Antoni";
  if (productCategory === "sport" || productCategory === "tech") {
    return gender === "male" ? "Adam" : "Elli";
  }
  return "Rachel";
}
