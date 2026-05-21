export type VideoGenre = "drama" | "reality" | "daily" | "custom";

export type VideoModel = "nano-banana" | "nano-banana-2" | "nano-banana-pro";

export type SubtitleStyle = "karaoke" | "simple" | "italic" | null;

export type UserPlan = "free" | "starter" | "pro";

export interface Dialogue {
  speaker: string;
  line: string;
  emotion: string;
}

export interface Scene {
  number: number;
  title: string;
  setting: string;
  emotion: string;
  characters: string[];
  video_prompt: string;
  subtitle_text: string;
  dialogues: Dialogue[];
}

export interface DramaScript {
  title: string;
  logline: string;
  scenes: Scene[];
}

export interface VideoClip {
  sceneNumber: number;
  videoId: string;
  status: "queued" | "processing" | "completed" | "failed";
  url?: string;
  error?: string;
}

export interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  genre: VideoGenre;
  model: VideoModel;
  duration: number;
  subtitles_style: SubtitleStyle;
  music_track: string | null;
  script: DramaScript | null;
  scenes_videos: VideoClip[];
  final_video_url: string | null;
  thumbnail_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  credits_used: number;
  created_at: string;
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  genre: VideoGenre | null;
  model: VideoModel;
  subtitles: SubtitleStyle;
  music: string | null;
  prompt: string;
  duration: number;
}

export const GENRE_OPTIONS = [
  {
    id: "drama" as const,
    icon: "🎭",
    title: "Drama",
    description: "Tromperies, ruptures, trahisons",
    image: "/genres/drama.jpg",
  },
  {
    id: "reality" as const,
    icon: "📺",
    title: "Téléréalité",
    description: "Confessions, clash, éliminations",
    image: "/genres/reality.jpg",
  },
  {
    id: "daily" as const,
    icon: "🍕",
    title: "Vie Quotidienne",
    description: "Humour, situations relatable, galères",
    image: "/genres/daily.jpg",
  },
  {
    id: "custom" as const,
    icon: "✨",
    title: "Custom",
    description: "Ton propre concept — écris ce que tu veux",
    image: "/genres/custom.jpg",
  },
];

export const MODEL_OPTIONS = [
  {
    id: "nano-banana" as const,
    name: "Nano Banana",
    badge: "Rapide · Standard",
    image: "/models/nano-banana.jpg",
    minPlan: "free" as UserPlan,
  },
  {
    id: "nano-banana-2" as const,
    name: "Nano Banana 2",
    badge: "HD · Plus détaillé",
    image: "/models/nano-banana-2.jpg",
    minPlan: "starter" as UserPlan,
  },
  {
    id: "nano-banana-pro" as const,
    name: "Nano Banana Pro",
    badge: "Pro · Ultra précis",
    image: "/models/nano-banana-pro.jpg",
    minPlan: "pro" as UserPlan,
  },
];

export const SUBTITLE_OPTIONS = [
  { id: "karaoke" as const, label: "Karaoké", preview: "C'EST PAS VRAI", style: "font-extrabold" },
  { id: "simple" as const, label: "Simple", preview: "NON", style: "font-normal" },
  { id: "italic" as const, label: "Italique", preview: "C'EST PAS VRAI", style: "italic" },
];

export const MUSIC_TRACKS = [
  { id: "miaw", name: "Miaw Miaw", duration: "1:35" },
  { id: "sad-slow", name: "Sad Song Slowed", duration: "4:21" },
  { id: "sad", name: "Sad Song", duration: "3:06" },
  { id: "epic", name: "Epic Drama", duration: "2:45" },
  { id: "telenovela", name: "Telenovela Theme", duration: "3:12" },
  { id: "suspense", name: "Suspense Build", duration: "1:58" },
];

export const DURATION_OPTIONS = [
  { seconds: 18, credits: 1, scenes: 3, plan: "free" },
  { seconds: 24, credits: 1, scenes: 4, plan: "free" },
  { seconds: 30, credits: 2, scenes: 5, plan: "free" },
  { seconds: 48, credits: 3, scenes: 6, plan: "starter" },
  { seconds: 60, credits: 4, scenes: 8, plan: "starter" },
  { seconds: 72, credits: 5, scenes: 9, plan: "starter" },
  { seconds: 90, credits: 6, scenes: 10, plan: "pro" },
  { seconds: 96, credits: 6, scenes: 11, plan: "pro" },
  { seconds: 108, credits: 7, scenes: 12, plan: "pro" },
  { seconds: 120, credits: 8, scenes: 13, plan: "pro" },
] as const;

export const FAQ_ITEMS = [
  {
    q: "Les vidéos générées sont-elles monétisables ?",
    a: "Oui, vous détenez les droits d'utilisation des vidéos générées via votre compte, sous réserve des conditions de la plateforme de publication.",
  },
  {
    q: "J'ai besoin d'être un expert en montage vidéo ?",
    a: "Non. FruitDrama génère script, images et vidéo automatiquement. Aucune compétence en montage requise.",
  },
  {
    q: "Combien de temps prend la génération d'une vidéo ?",
    a: "En général 2 à 5 minutes selon la durée et le nombre de scènes.",
  },
  {
    q: "FruitDrama va automatiquement poster mes vidéos ?",
    a: "Non. Vous téléchargez et publiez manuellement sur TikTok, Instagram ou YouTube.",
  },
  {
    q: "Combien de vidéos je peux générer avec mon plan ?",
    a: "Gratuit : 3 crédits. Starter : 30/mois. Pro : illimité.",
  },
  {
    q: "Les crédits non utilisés sont-ils reportés ?",
    a: "Non, les crédits mensuels se renouvellent chaque cycle de facturation.",
  },
  {
    q: "Le contenu généré est-il libre de droits ?",
    a: "Oui pour un usage commercial sur les réseaux sociaux via votre compte FruitDrama.",
  },
  {
    q: "Je peux utiliser les vidéos sur TikTok, Instagram et YouTube ?",
    a: "Oui, format 9:16 optimisé pour TikTok, Reels et Shorts.",
  },
  {
    q: "C'est gratuit pour essayer ?",
    a: "Oui, 3 crédits offerts à l'inscription sans carte bancaire.",
  },
  {
    q: "Je peux annuler à tout moment ?",
    a: "Oui, annulation en un clic depuis les paramètres de facturation.",
  },
];

export function scenesForDuration(seconds: number): number {
  const opt = DURATION_OPTIONS.find((d) => d.seconds === seconds);
  return opt?.scenes ?? 5;
}

export function creditsForDuration(seconds: number): number {
  const opt = DURATION_OPTIONS.find((d) => d.seconds === seconds);
  return opt?.credits ?? 2;
}

export function isDurationLocked(seconds: number, plan: UserPlan): boolean {
  const opt = DURATION_OPTIONS.find((d) => d.seconds === seconds);
  if (!opt) return true;
  const order: UserPlan[] = ["free", "starter", "pro"];
  return order.indexOf(plan) < order.indexOf(opt.plan as UserPlan);
}

export function isModelLocked(model: VideoModel, plan: UserPlan): boolean {
  const m = MODEL_OPTIONS.find((x) => x.id === model);
  if (!m) return true;
  const order: UserPlan[] = ["free", "starter", "pro"];
  return order.indexOf(plan) < order.indexOf(m.minPlan);
}
