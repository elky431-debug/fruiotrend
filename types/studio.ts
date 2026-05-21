export interface Character {
  id: string;
  name: string;
  type: string;
  gender: "homme" | "femme";
  outfit: string;
  personality: string;
  color: string;
  role?: string;
  gemini_character_sheet: string;
  imageUrl?: string;
}

export interface Dialogue {
  speaker: string;
  line: string;
  emotion: string;
  subtext?: string;
}

export interface ScenePromptCharacter {
  name: string;
  type: string;
  gender: "homme" | "femme";
  outfit: string;
}

export interface ScenePromptData {
  setting: string;
  emotion: string;
  action: string;
  narrative_beat: string;
  characters: ScenePromptCharacter[];
}

export interface Scene {
  number: number;
  title: string;
  setting: string;
  emotion: string;
  subtitle: string;
  characters_in_scene: string[];
  narrative_beat?: string;
  dialogues: Dialogue[];
  gemini_scene_prompt: string;
  grok_video_prompt: string;
  scenePromptData?: ScenePromptData;
  imageUrl?: string;
  videoUrl?: string;
}

export interface DramaScript {
  title: string;
  logline: string;
  tension_arc?: string;
  characters: Character[];
  scenes: Scene[];
}

export interface StudioState {
  script: DramaScript | null;
  images: Record<string, string>;
  videos: Record<number, string>;
  currentTab: 1 | 2 | 3;
}
