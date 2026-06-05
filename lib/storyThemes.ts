export const STORY_THEMES = {
  wojak: {
    id: "wojak",
    name: "Vie Quotidienne NPC",
    emoji: "🗿",
    description: "Personnage NPC Wojak dans une histoire du quotidien",
    example: "Un entrepreneur stressé découvre le produit qui change tout",
  },
  "fruit-drama": {
    id: "fruit-drama",
    name: "Fruit Drama",
    emoji: "🍌",
    description: "Personnages fruits Pixar dans un court-métrage dramatique",
    example: "Une banane découvre une solution grâce au produit",
  },
} as const;

export type StoryThemeId = keyof typeof STORY_THEMES;

export const FRUIT_CHARACTERS = [
  { id: "banana", name: "Banane", emoji: "🍌", personality: "naïf, optimiste, travailleur" },
  { id: "strawberry", name: "Fraise", emoji: "🍓", personality: "séductrice, ambitieuse, rusée" },
  { id: "pomegranate", name: "Grenade", emoji: "🫐", personality: "autoritaire, riche, intimidant" },
  { id: "mango", name: "Mangue", emoji: "🥭", personality: "charismatique, confiant, leader" },
  { id: "cherry", name: "Cerise", emoji: "🍒", personality: "espiègle, rapide, imprévisible" },
  { id: "lemon", name: "Citron", emoji: "🍋", personality: "acide, sarcastique, malin" },
  { id: "avocado", name: "Avocat", emoji: "🥑", personality: "cool, décontracté, moderne" },
  { id: "grape", name: "Raisin", emoji: "🍇", personality: "mystérieux, élégant, manipulateur" },
] as const;

export const WOJAK_PROFILES = [
  { id: "entrepreneur", name: "Entrepreneur", emoji: "💼", context: "bureau à domicile, laptop, café froid" },
  { id: "etudiant", name: "Étudiant", emoji: "📚", context: "chambre en désordre, révisions, stress" },
  { id: "sportif", name: "Sportif", emoji: "🏋️", context: "salle de sport, après entraînement" },
  { id: "parent", name: "Parent débordé", emoji: "👶", context: "maison en chaos, enfants, fatigue" },
  { id: "salarie", name: "Salarié", emoji: "😔", context: "open space, patron, métro boulot dodo" },
] as const;
