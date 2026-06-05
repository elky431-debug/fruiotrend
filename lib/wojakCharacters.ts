export const WOJAK_CHARACTERS = [
  {
    id: "doomer_male",
    name: "Le Doomer",
    emoji: "🚬",
    description: "Bonnet noir, cigarette, regard vide — déprimé",
    file: "doomer_male.png",
    gender: "male",
    mood: "dark",
  },
  {
    id: "doomer_girl",
    name: "Doomer Girl",
    emoji: "🖤",
    description: "Cheveux blonds, bonnet, look mélancolique",
    file: "doomer_girl.png",
    gender: "female",
    mood: "dark",
  },
  {
    id: "wojak_classic",
    name: "Wojak Classique",
    emoji: "😐",
    description: "Le Wojak original — chauve, regard vide",
    file: "wojak_classic.png",
    gender: "male",
    mood: "neutral",
  },
  {
    id: "rich_beard",
    name: "Le Barbu",
    emoji: "🧔",
    description: "Barbe noire, chauve, air sérieux",
    file: "rich_beard.png",
    gender: "male",
    mood: "neutral",
  },
  {
    id: "rich_plain",
    name: "Le Simple",
    emoji: "🗿",
    description: "Wojak simple, cheveux longs, regard neutre",
    file: "rich_plain.png",
    gender: "male",
    mood: "neutral",
  },
  {
    id: "suit",
    name: "Le Costard",
    emoji: "💼",
    description: "Costume noir, cravate rouge — le patron",
    file: "suit.webp",
    gender: "male",
    mood: "serious",
  },
] as const;

export type WojakCharacterId = (typeof WOJAK_CHARACTERS)[number]["id"];

export function getWojakCharacter(id?: string) {
  return WOJAK_CHARACTERS.find((c) => c.id === id) ?? WOJAK_CHARACTERS[2];
}
