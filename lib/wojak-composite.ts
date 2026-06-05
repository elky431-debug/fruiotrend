// Composite désactivé — Gemini génère maintenant le personnage complet
// avec corps et tête Wojak directement dans l'image.

export async function createWojakComposite(): Promise<null> {
  return null;
}

/** @deprecated Utiliser la génération Gemini corps complet (Wojak V2) */
export async function compositeWojakOnBackground(): Promise<string> {
  throw new Error(
    "Composite Wojak désactivé — utilisez la génération Gemini corps complet."
  );
}

export { WOJAK_CHARACTERS } from "@/lib/wojakCharacters";
