export type AdTemplate =
  | "living_product"
  | "influencer"
  | "before_after"
  | "product_demo"
  | "lifestyle"
  | "absurd_problem"
  | "unboxing"
  | "testimonial";

export interface AdTemplateConfig {
  id: AdTemplate;
  name: string;
  emoji: string;
  description: string;
  bestFor: string[];
  scenes: number;
  hook_style: string;
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
}

export interface AdCharacter {
  name: string;
  type: string;
  description: string;
  outfit: string;
  personality: string;
  gemini_character_prompt: string;
}

export interface AdScene {
  number: number;
  title: string;
  aida_stage?: string;
  visual_description: string;
  character_action: string;
  voiceover: string;
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
  productVisualDescription: string;
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
