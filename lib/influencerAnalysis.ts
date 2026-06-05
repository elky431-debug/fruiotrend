import OpenAI from "openai";
import type { InfluencerImageType, InfluencerTraits } from "@/types/ad";

export type { InfluencerTraits };

export type InfluencerImageRef = {
  base64?: string;
  mimeType?: string;
};

const TRAIT_EXTRACTION_PROMPT = `Analyze the uploaded reference image for character generation.

Extract visual traits ONLY — do NOT identify or name any real person.

Return valid JSON with exactly these keys:
{
  "gender": "male | female | androgynous — apparent gender presentation",
  "faceShape": "oval | round | square | heart | long | angular — be specific",
  "skinTone": "precise skin tone (e.g. light beige, medium brown, deep ebony, olive, fair pink)",
  "hairColor": "exact hair color including highlights",
  "hairStyle": "length, texture, cut, parting (e.g. short curly black hair, shoulder-length straight blonde with bangs)",
  "bodyType": "slim | athletic | average | curvy | stocky | petite — apparent build",
  "expression": "neutral | smiling | serious | surprised | tired — mouth and eyes",
  "imageType": "photo | cartoon | illustration | drawing | unknown",
  "ageRange": "approximate age range (e.g. early 20s, mid 30s)",
  "facialHair": "none | beard | mustache | stubble — describe if present",
  "accessories": "glasses, jewelry, hat, etc. or none",
  "outfit": "visible clothing colors and style",
  "distinctiveFeatures": "unique traits: freckles, moles, scars, eyebrow shape, nose shape, etc."
}

RULES:
- If the image is a cartoon, drawing, or illustration → set imageType accordingly and extract ALL stylized traits faithfully (hair, colors, face proportions, outfit).
- Be extremely specific on hair color, hair style, skin tone, and face structure — these are HARD CONSTRAINTS for generation.
- Output JSON only, no markdown.`;

function normalizeImageType(value: unknown): InfluencerImageType {
  const v = String(value || "").toLowerCase();
  if (v === "photo" || v === "cartoon" || v === "illustration" || v === "drawing") {
    return v;
  }
  return "unknown";
}

function parseTraitsJson(raw: string): InfluencerTraits | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const data = JSON.parse(cleaned) as Record<string, unknown>;
    const gender = String(data.gender || "").trim();
    const hairColor = String(data.hairColor || "").trim();
    const skinTone = String(data.skinTone || "").trim();

    if (!gender || !hairColor || !skinTone) return null;

    return {
      gender,
      faceShape: String(data.faceShape || "unspecified").trim(),
      skinTone,
      hairColor,
      hairStyle: String(data.hairStyle || "unspecified").trim(),
      bodyType: String(data.bodyType || "unspecified").trim(),
      expression: String(data.expression || "neutral").trim(),
      imageType: normalizeImageType(data.imageType),
      ageRange: data.ageRange ? String(data.ageRange).trim() : undefined,
      facialHair: data.facialHair ? String(data.facialHair).trim() : undefined,
      accessories: data.accessories ? String(data.accessories).trim() : undefined,
      outfit: data.outfit ? String(data.outfit).trim() : undefined,
      distinctiveFeatures: data.distinctiveFeatures
        ? String(data.distinctiveFeatures).trim()
        : undefined,
    };
  } catch {
    return null;
  }
}

/** Logs extracted traits before image generation (validation step). */
export function validateAndLogInfluencerTraits(
  traits: InfluencerTraits
): void {
  console.log("[INFLUENCER-TRAITS] ── Validation avant génération ──");
  console.log("[INFLUENCER-TRAITS] gender:", traits.gender);
  console.log("[INFLUENCER-TRAITS] hairColor:", traits.hairColor);
  console.log("[INFLUENCER-TRAITS] skinTone:", traits.skinTone);
  console.log("[INFLUENCER-TRAITS] faceShape:", traits.faceShape);
  console.log("[INFLUENCER-TRAITS] hairStyle:", traits.hairStyle);
  console.log("[INFLUENCER-TRAITS] bodyType:", traits.bodyType);
  console.log("[INFLUENCER-TRAITS] expression:", traits.expression);
  console.log("[INFLUENCER-TRAITS] imageType:", traits.imageType);
  if (traits.ageRange) console.log("[INFLUENCER-TRAITS] ageRange:", traits.ageRange);
  if (traits.distinctiveFeatures) {
    console.log(
      "[INFLUENCER-TRAITS] distinctiveFeatures:",
      traits.distinctiveFeatures
    );
  }
  console.log("[INFLUENCER-TRAITS] ── Contraintes verrouillées ──");
}

export function buildInfluencerTraitsConstraintBlock(
  traits: InfluencerTraits
): string {
  const isStylized =
    traits.imageType === "cartoon" ||
    traits.imageType === "illustration" ||
    traits.imageType === "drawing";

  const stylizedNote = isStylized
    ? `
SOURCE IMAGE TYPE: ${traits.imageType.toUpperCase()}
The reference is NOT a real photo — it is a ${traits.imageType}.
Extract and preserve its stylized visual identity faithfully in Pixar 3D CGI:
same character design cues, proportions, colors, hair, and face structure.`
    : `
SOURCE IMAGE TYPE: PHOTO
The reference is a real person — the Pixar character MUST be recognizably derived from them.`;

  return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
HARD CHARACTER CONSTRAINTS — FROM UPLOADED REFERENCE
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
${stylizedNote}

These traits were analyzed from the uploaded image. They are NON-NEGOTIABLE:

LOCKED IDENTITY:
- Gender: ${traits.gender} — MUST match exactly, do NOT swap
- Face shape / structure: ${traits.faceShape} — preserve jawline, cheekbones, nose and eye spacing
- Skin tone: ${traits.skinTone} — exact same tone in Pixar 3D render
- Hair color: ${traits.hairColor} — exact same color, no substitutions
- Hair style: ${traits.hairStyle} — same length, cut, texture and parting
- Body type: ${traits.bodyType}
- Expression baseline: ${traits.expression}
${traits.ageRange ? `- Age range: ${traits.ageRange}` : ""}
${traits.facialHair ? `- Facial hair: ${traits.facialHair}` : ""}
${traits.accessories ? `- Accessories: ${traits.accessories} — keep all` : ""}
${traits.outfit ? `- Outfit: ${traits.outfit} — same colors and style in Pixar 3D` : ""}
${traits.distinctiveFeatures ? `- Distinctive features: ${traits.distinctiveFeatures}` : ""}

MANDATORY:
✅ The generated Pixar character must look like the SAME person/character as the reference
✅ Someone who knows the reference should recognize them immediately
✅ Apply Pixar 3D CGI stylization (bigger eyes, smooth skin) WITHOUT changing identity

FORBIDDEN:
❌ Generating a random default character
❌ Changing gender, hair color, hair style, or skin tone
❌ Inventing a different face structure
❌ Ignoring the reference and creating a generic presenter
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
}

export async function analyzeInfluencerPhoto(
  image: InfluencerImageRef | null | undefined
): Promise<InfluencerTraits | null> {
  if (!image?.base64) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[INFLUENCER-TRAITS] OPENAI_API_KEY manquante — traits non extraits"
    );
    return null;
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${image.mimeType || "image/jpeg"};base64,${image.base64}`,
                detail: "high" as const,
              },
            },
            { type: "text", text: TRAIT_EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const traits = parseTraitsJson(raw);
    if (traits) {
      validateAndLogInfluencerTraits(traits);
      return traits;
    }

    console.warn("[INFLUENCER-TRAITS] JSON invalide:", raw.slice(0, 200));
  } catch (err) {
    console.error(
      "[INFLUENCER-TRAITS] Erreur extraction:",
      err instanceof Error ? err.message : err
    );
  }

  return null;
}
