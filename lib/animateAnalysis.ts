import OpenAI from "openai";
import type { AnimateTheme } from "@/lib/animateThemes";

/**
 * Analyse une image via GPT-4o et propose une animation « logique » et courte,
 * cohérente avec le thème choisi. Le but : que l'IA anime chaque image de la
 * manière la plus naturelle possible (un produit tourne/flotte, une personne
 * bouge subtilement, une UI défile en parallax, etc.).
 *
 * Best-effort : en cas d'échec (pas de clé, erreur API), on retombe sur
 * l'indice de mouvement générique du thème pour ne jamais bloquer la vidéo.
 */
export async function planImageMotion(
  imageBase64: string,
  mimeType: string,
  theme: AnimateTheme,
  userPrompt?: string
): Promise<string> {
  const request = userPrompt?.trim();
  const fallback = request || theme.motionHint;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !imageBase64) return fallback;

  const userBlock = request
    ? `\n\nUSER REQUEST (highest priority — the animation MUST reflect this): "${request}"`
    : "";

  const instruction = `You are a motion director for short vertical (9:16) product/lifestyle video ads.

Look at this image and design the MOST LOGICAL, natural short animation for it, in the style: "${theme.name}" — ${theme.style}${userBlock}

Rules:
- Describe ONLY realistic in-place motion that fits what is actually in the image (a bottle can rotate and catch light, a person can breathe/blink/smile, a phone UI can scroll/parallax, food can steam).
- The subject must stay exactly as-is — never invent new objects or change its shape.
- If a user request is provided above, honor it precisely while keeping the motion realistic.
- Keep it to 1-2 concise sentences of concrete camera + subject motion + lighting.
- English only. No preamble, output just the motion description.

Target vibe: ${theme.motionHint}.`;

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 180,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                detail: "low",
              },
            },
            { type: "text", text: instruction },
          ],
        },
      ],
    });

    const motion = response.choices[0]?.message?.content?.trim();
    return motion && motion.length > 8 ? motion : fallback;
  } catch (err) {
    console.error(
      "[ANIMATE/ANALYSIS]",
      err instanceof Error ? err.message : err
    );
    return fallback;
  }
}
