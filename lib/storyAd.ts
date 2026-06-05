import type { AdScript, NarrativeRole, ProductInput } from "@/types/ad";
import type { StoryThemeId } from "@/lib/storyThemes";
import { WOJAK_CONFIG } from "@/lib/wojakConfig";
import { buildWojakVideoPrompt } from "@/lib/wojakVideoPrompt";

export type StoryScenePayload = {
  index?: number;
  id?: number;
  role: string;
  narrative_role?: string;
  subtitle?: string;
  voiceover?: string;
  subtitle_color?: string;
  visual_description: string;
  character_pose?: string;
  background: string;
  show_product?: boolean;
  duration_seconds?: number;
};

export type StoryScriptResponse = {
  title: string;
  theme: StoryThemeId;
  productType?: "product" | "app";
  isApp?: boolean;
  scenes: StoryScenePayload[];
};

function mapNarrativeRole(role: string): NarrativeRole {
  if (role === "solution") return "solution";
  if (role === "discovery") return "discovery";
  return "problem";
}

export function storyResponseToAdScript(
  story: StoryScriptResponse,
  product: ProductInput
): AdScript {
  const isWojak = story.theme === "wojak";
  const maxScenes = isWojak ? WOJAK_CONFIG.nScenes : 2;
  const defaultDuration = isWojak ? WOJAK_CONFIG.secondsPerScene : 7;

  const scenes = (story.scenes || []).slice(0, maxScenes).map((s, i) => {
    const narrativeRole = mapNarrativeRole(
      s.narrative_role || s.role || "problem"
    );

    return {
      number: i + 1,
      title: isWojak ? `Acte ${i + 1}` : s.subtitle || `Scène ${i + 1}`,
      narrative_role: narrativeRole,
      background: s.background || "",
      visual_description: s.visual_description || "",
      character_action: s.character_pose || "",
      voiceover: (s.voiceover || "").trim(),
      voiceover_word_count: (s.voiceover || "")
        .split(/\s+/)
        .filter(Boolean).length,
      duration_seconds: s.duration_seconds ?? defaultDuration,
      mouth_expression: isWojak ? "neutral closed mouth" : "speaking to camera",
      emotion: isWojak
        ? "neutral"
        : s.role === "solution"
          ? "relieved"
          : "stressed",
      subtitle: isWojak ? "" : s.subtitle || `SCÈNE ${i + 1}`,
      hook: story.title || product.name,
      gemini_prompt: "",
      grok_video_prompt: isWojak
        ? buildWojakVideoPrompt(
            narrativeRole,
            s.duration_seconds ?? defaultDuration
          )
        : "Pixar 3D fruit drama cinematic, dramatic lighting, 9:16 vertical",
      productVisualDescription: product.description,
    };
  });

  const totalSec = scenes.reduce(
    (acc, s) => acc + (s.duration_seconds ?? defaultDuration),
    0
  );

  return {
    title: story.title || product.name,
    hook: story.title || "",
    cta: "",
    duration: `${totalSec}s`,
    totalDuration: totalSec,
    productVisualDescription: product.description,
    nScenes: scenes.length,
    scenes,
    character: {
      name: product.name,
      type: story.theme,
      description: product.description,
      outfit: "",
      personality: "",
      gemini_character_prompt: "",
    },
  };
}

export function storyDataToProductInput(data: {
  productName: string;
  productDescription: string;
  productType: "product" | "app";
  productImages: { base64: string; mimeType: string }[];
  appScreenshots: { base64: string; mimeType: string }[];
  appUrl?: string;
  theme: StoryThemeId;
  wojak_profile?: string;
}): ProductInput {
  const isWojak = data.theme === "wojak";
  const images =
    data.productType === "app"
      ? data.appScreenshots.map((s) => s.base64)
      : data.productImages.map((s) => s.base64);
  const imagesMimeType =
    data.productType === "app"
      ? data.appScreenshots.map((s) => s.mimeType)
      : data.productImages.map((s) => s.mimeType);

  const nScenes = isWojak ? WOJAK_CONFIG.nScenes : 2;
  const duration = isWojak
    ? WOJAK_CONFIG.nScenes * WOJAK_CONFIG.secondsPerScene
    : 14;

  return {
    name: data.productName,
    description: data.productDescription,
    targetAudience: "TikTok viral",
    adGoal: "Viral / Partage",
    template: "living_product",
    nScenes,
    duration,
    images,
    imagesMimeType,
    productType: data.productType,
    storyTheme: data.theme,
    storyMode: true,
    appUrl: data.appUrl,
    wojakCharacterId: data.wojak_profile || "wojak_classic",
  };
}
