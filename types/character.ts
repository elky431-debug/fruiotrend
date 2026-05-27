export interface CharacterDef {
  id: string;
  /** ID stable dans la bibliothèque (réutilisation entre vidéos) */
  libraryId?: string;
  name: string;
  type: string;
  gender: "homme" | "femme";
  outfit: string;
  personality: string;
  role: string;
  color: string;
  backstory: string;
  saved: boolean;
}
