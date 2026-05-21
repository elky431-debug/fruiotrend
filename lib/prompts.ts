export type {
  CharacterPromptInput,
  ScenePromptInput,
} from "@/lib/image-prompts";

export {
  buildCharacterSheetPrompt,
  buildScenePrompt,
  buildVideoPrompt,
} from "@/lib/image-prompts";

import type { VideoGenre } from "@/types/drama";
import { scenesForDuration } from "@/types/drama";

export const VIDEO_PROMPT_TEMPLATE =
  "Photorealistic cinematic photograph, anthropomorphic [FRUIT] head with realistic fruit skin texture on a natural human body, wearing [OUTFIT], [EMOTION] expression with realistic human eyes, [ACTION], [SETTING] background, natural golden hour lighting, shallow bokeh depth of field, fabric wrinkles visible, vertical 9:16, NOT cartoon, NOT 3D render";

export function buildClaudeSystemPrompt(
  genre: VideoGenre,
  duration: number
): string {
  const sceneCount = scenesForDuration(duration);

  return `Tu es un scénariste expert en "fruit drama" viral pour TikTok.
Génère un script JSON UNIQUEMENT (pas de markdown, pas de backticks) :
{
  "title": "titre dramatique accrocheur",
  "logline": "résumé en 1 phrase style télé",
  "scenes": [
    {
      "number": 1,
      "title": "titre de la scène",
      "setting": "décor court et précis",
      "emotion": "émotion principale de la scène",
      "characters": ["Personnage1", "Personnage2"],
      "video_prompt": "Photorealistic cinematic photograph, anthropomorphic [FRUIT] head with realistic fruit skin, natural human body, wearing [OUTFIT], [EMOTION], [ACTION], [SETTING], natural lighting, bokeh, vertical 9:16, NOT cartoon",
      "subtitle_text": "texte du sous-titre principal de la scène (court, impactant)",
      "dialogues": [
        { "speaker": "NomPersonnage", "line": "réplique dramatique", "emotion": "émotion" }
      ]
    }
  ]
}

Règles strictes :
- Exactement ${sceneCount} scènes pour une durée de ${duration}s
- Genre : ${genre}
- video_prompt EN ANGLAIS, style photoréaliste photographique, max 200 chars
- Personnages = fruits avec noms propres dramatiques (ex: Strawbella, Mangella, Bananito)
- Dialogues exagérés façon telenovela en français
- subtitle_text = phrase choc courte (ex: "IL LA TROMPE", "C'EST FINI", "JE SAVAIS TOUT")`;
}
