export type AdTemplate =
  | "living_product"
  | "influencer"
  | "product_demo";

export interface AdTemplateConfig {
  id: AdTemplate;
  name: string;
  emoji: string;
  description: string;
  bestFor: string[];
  scenes: number;
  hook_style: string;
}

export interface ProductImageAsset {
  base64: string;
  mimeType: string;
  url: string;
}

export interface ProductInput {
  name: string;
  description: string;
  targetAudience: string;
  adGoal: string;
  template: AdTemplate;
  nScenes: number;
  duration: number;
  images: string[];
  imagesMimeType: string[];
  packagingImage?: ProductImageAsset | null;
}

export interface AdCharacter {
  name: string;
  type: string;
  description: string;
  outfit: string;
  personality: string;
  gemini_character_prompt: string;
}

export type NarrativeRole = "problem" | "discovery" | "solution";

export interface AdScene {
  number: number;
  title: string;
  aida_stage?: string;
  /** Rôle narratif : problème → découverte → solution */
  narrative_role?: NarrativeRole;
  /** Décor contextuel EN (généré par GPT) — injecté dans les prompts image */
  background?: string;
  visual_description: string;
  character_action: string;
  voiceover: string;
  /** Durée cible de la scène (secondes) */
  duration_seconds?: number;
  voiceover_word_count?: number;
  emotion?: string;
  /** Expression de bouche pour Gemini / vidéo */
  mouth_expression?: string;
  subtitle: string;
  hook: string;
  gemini_prompt: string;
  grok_video_prompt: string;
  productVisualDescription?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioBase64?: string;
}

export interface AdScript {
  title: string;
  hook: string;
  cta: string;
  duration: string;
  totalDuration?: number;
  productVisualDescription: string;
  /** Nombre de scènes demandé à la génération (choix utilisateur). */
  nScenes: number;
  scenes: AdScene[];
  character: AdCharacter;
}

export interface AdCreativeState {
  step: 1 | 2 | 3 | 4;
  product: ProductInput | null;
  script: AdScript | null;
  sceneImages: Record<string, string>;
  sceneVideos: Record<string, string>;
}
