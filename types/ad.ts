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

export type InfluencerImageType =
  | "photo"
  | "cartoon"
  | "illustration"
  | "drawing"
  | "unknown";

/** Traits visuels extraits de la photo influenceur (contraintes de génération). */
export interface InfluencerTraits {
  gender: string;
  faceShape: string;
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  expression: string;
  imageType: InfluencerImageType;
  ageRange?: string;
  facialHair?: string;
  accessories?: string;
  outfit?: string;
  distinctiveFeatures?: string;
}

export type ProductType = "product" | "app";

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
  influencerMode?: "ai" | "photo";
  influencerImage?: ProductImageAsset | null;
  /** Traits extraits de la photo influenceur — contraintes pour la génération Pixar */
  influencerTraits?: InfluencerTraits | null;
  /** Photo influenceur : garder le décor d'origine ("keep") ou le changer ("change") */
  influencerBackgroundMode?: "keep" | "change";
  /** "product" (défaut) ou "app" — pub pour une appli/site (personnage tient un smartphone) */
  productType?: ProductType;
  /** Style de script choisi côté pub appli (preset id ou "custom") */
  scriptMode?: string;
  /** Voiceover saisi manuellement (mode "custom") */
  customVoiceover?: string;
  /** History Ads — thème wojak ou fruit-drama */
  storyTheme?: "wojak" | "fruit-drama";
  /** History Ads — active le pipeline story dans /api/images */
  storyMode?: boolean;
  /** URL appli (History Ads ou pub appli) */
  appUrl?: string;
  /** History Ads Wojak — id du personnage PNG (doomer_male, etc.) */
  wojakCharacterId?: string;
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
