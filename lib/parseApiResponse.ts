/** Parse une réponse API en JSON sans planter sur les erreurs Netlify (HTML/texte). */
export async function parseApiJson<T = Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; parseError: string | null }> {
  const text = await res.text();
  if (!text.trim()) {
    return { data: null, parseError: "Réponse vide du serveur." };
  }
  try {
    return { data: JSON.parse(text) as T, parseError: null };
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    if (/internal\s*error/i.test(text)) {
      return {
        data: null,
        parseError:
          "Le serveur a expiré ou la requête est trop lourde. Réessaie avec une photo plus légère.",
      };
    }
    return {
      data: null,
      parseError: snippet || "Réponse serveur invalide.",
    };
  }
}
