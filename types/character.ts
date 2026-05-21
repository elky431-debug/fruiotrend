export interface CharacterDef {
  id: string;
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
