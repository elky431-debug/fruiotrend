import OpenAI from "openai";
import type { CharacterDef } from "@/types/character";
import type { DramaScript } from "@/types/studio";

function escapeJson(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function buildSystemPrompt(
  univers: string,
  genre: string,
  nScenes: number,
  duration: string,
  characters: CharacterDef[]
): string {
  const charsDescription = characters
    .map(
      (c, i) => `
PERSONNAGE ${i + 1} — ${c.name} (${c.type} · ${c.gender})
- Rôle dans l'histoire : ${c.role}
- Apparence & tenue : ${c.outfit || "à définir selon le contexte"}
- Personnalité : ${c.personality || "à définir"}
- Couleur dominante : ${c.color || "couleur naturelle du fruit"}
- Backstory & motivations : ${c.backstory || "passé mystérieux"}`
    )
    .join("\n");

  const charsForJson = characters
    .map(
      (c) => `{
  "id": "${escapeJson(c.id)}",
  "name": "${escapeJson(c.name)}",
  "type": "${escapeJson(c.type)}",
  "gender": "${c.gender}",
  "outfit": "${escapeJson(c.outfit)}",
  "personality": "${escapeJson(c.personality)}",
  "color": "${escapeJson(c.color || "couleur naturelle")}",
  "role": "${escapeJson(c.role)}",
  "gemini_character_sheet": "(généré côté serveur — photoréaliste)"
}`
    )
    .join(",\n");

  return `Tu es un scénariste expert de soap-opéras viraux TikTok avec des personnages en ${univers} anthropomorphiques style PHOTORÉALISTE (comme une vraie photo, pas cartoon).

TON TRAVAIL : prendre l'idée de l'utilisateur et construire une VRAIE intrigue dramatique autour, avec les personnages EXACTEMENT tels que décrits. L'histoire doit coller précisément à ce que l'user a demandé.

PERSONNAGES DE L'HISTOIRE (utilise-les EXACTEMENT) :
${charsDescription}

RÈGLES D'OR INVIOLABLES :
1. Utilise UNIQUEMENT les personnages listés avec leurs vrais noms
2. Respecte le rôle de chaque personnage (protagoniste, traître, antagoniste...)
3. Chaque scène a MINIMUM 2 speakers DIFFÉRENTS — monologues INTERDITS
4. L'intrigue doit être directement tirée de l'idée de l'user
5. Chaque scène finit sur un rebondissement ou révélation
6. Dialogues ULTRA dramatiques façon telenovela
7. Intègre le backstory dans les tensions et dialogues

STRUCTURE pour ${nScenes} scènes · Durée ${duration} · Genre ${genre} :
- Scène 1 : Mise en place + premier indice de tension
- Scène 2 : Confrontation / secret partiellement révélé
- Scène 3 : Rebondissement / trahison / choc
- Scène ${nScenes} : Climax + fin ouverte ou justice

Génère un JSON UNIQUEMENT (zéro markdown) :
{
  "title": "titre dramatique",
  "logline": "accroche 1 phrase style Netflix",
  "tension_arc": "arc émotionnel global en 1 phrase",
  "characters": [${charsForJson}],
  "scenes": [
    {
      "number": 1,
      "title": "titre scène",
      "setting": "décor précis + ambiance",
      "emotion": "émotion en 1 mot",
      "subtitle": "TEXTE CHOC MAJUSCULES 4 MOTS MAX",
      "characters_in_scene": ["id1", "id2"],
      "narrative_beat": "ce qui se passe et pourquoi c'est crucial",
      "dialogues": [
        { "speaker": "NomExact", "line": "réplique dramatique", "emotion": "émotion", "subtext": "pensée cachée" }
      ],
      "gemini_scene_prompt": "(généré côté serveur — photoréaliste)",
      "grok_video_prompt": "Photorealistic video 9:16. SCÈNE: [setting]. PERSONNAGES: [noms + fruit head réaliste + tenue usée]. ACTION: [mouvements]. CAMÉRA: dolly-in léger. NOT cartoon."
    }
  ]
}

DIALOGUES : minimum 3 échanges par scène, speakers différents, au moins 1 cliffhanger par scène.
JSON pur uniquement.`;
}

function validateScript(data: unknown): DramaScript {
  const script = data as DramaScript;
  if (!script?.title || !script?.logline || !Array.isArray(script?.characters) || !Array.isArray(script?.scenes)) {
    throw new Error("Structure JSON invalide");
  }
  if (script.characters.length < 2) {
    throw new Error("Le script doit contenir au moins 2 personnages");
  }
  return script;
}

export async function generateStudioScript(params: {
  prompt: string;
  univers: string;
  genre: string;
  nScenes: number;
  duration: string;
  characters: CharacterDef[];
}): Promise<DramaScript> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  if (!params.characters?.length || params.characters.length < 2) {
    throw new Error("Au moins 2 personnages requis");
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          params.univers,
          params.genre,
          params.nScenes,
          params.duration,
          params.characters
        ),
      },
      {
        role: "user",
        content: `IDÉE DE L'HISTOIRE : ${params.prompt}\n\nGENRE : ${params.genre}\nUNIVERS : ${params.univers}\nDURÉE : ${params.duration}\nSCÈNES : ${params.nScenes}\n\nConstruis l'intrigue EXACTEMENT autour de cette idée avec ces personnages.`,
      },
    ],
    temperature: 1.0,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Réponse OpenAI vide");

  const script = validateScript(JSON.parse(content));

  for (const scene of script.scenes) {
    const speakers = new Set((scene.dialogues ?? []).map((d) => d.speaker));
    if (speakers.size < 2) {
      console.warn(`Scène ${scene.number}: un seul speaker détecté`);
    }
  }

  return script;
}
