import Anthropic from "@anthropic-ai/sdk";
import { buildClaudeSystemPrompt } from "@/lib/prompts";
import type { DramaScript, VideoGenre } from "@/types/drama";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2000;

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1) return trimmed.slice(start, end + 1);
  return trimmed;
}

function validateScript(data: unknown): DramaScript {
  const script = data as DramaScript;
  if (!script?.title || !script?.logline || !Array.isArray(script?.scenes)) {
    throw new Error("Invalid script structure");
  }
  for (const scene of script.scenes) {
    if (!scene.video_prompt || scene.video_prompt.length > 200) {
      throw new Error(`Scene ${scene.number}: video_prompt invalid`);
    }
  }
  return script;
}

export async function generateDramaScript(
  userPrompt: string,
  genre: VideoGenre,
  duration: number
): Promise<DramaScript> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const system = buildClaudeSystemPrompt(genre, duration);

  const attempt = async (temperature: number) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature,
      system,
      messages: [
        {
          role: "user",
          content: `Écris un fruit drama basé sur cette idée:\n\n${userPrompt}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("No text in Claude response");
    return validateScript(JSON.parse(extractJson(block.text)));
  };

  try {
    return await attempt(0.8);
  } catch {
    return await attempt(0.3);
  }
}

export async function generateIdeaSuggestion(genre: VideoGenre): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallbacks: Record<VideoGenre, string> = {
      drama: "Une mangue découvre que son mari la trompe avec sa meilleure amie figue lors d'un dîner de gala.",
      reality: "Deux cerises se disputent le dernier coeur sur l'île des fruits — élimination ce soir.",
      daily: "Un avocat en retard au travail renverse son smoothie sur son patron banane.",
      custom: "Les raisins jumeaux héritent d'une chocolaterie mystérieuse et se déchirent pour le contrôle.",
    };
    return fallbacks[genre];
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Propose UNE idée de fruit drama courte (2 phrases max) pour le genre "${genre}". Réponds uniquement avec l'idée, en français.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text"
    ? block.text.trim()
    : "Une fraise découvre un secret de famille qui va tout changer.";
}
