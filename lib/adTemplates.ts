import type { AdTemplate, AdTemplateConfig } from "@/types/ad";

export const AD_TEMPLATES: AdTemplateConfig[] = [
  {
    id: "living_product",
    name: "Produit Vivant",
    emoji: "🧸",
    description:
      "Ton produit devient un personnage cartoon qui parle et se présente lui-même",
    bestFor: ["accessoires", "nourriture", "gadgets", "vêtements", "chaussures"],
    scenes: 3,
    hook_style: "Le produit s'anime soudainement et interpelle le spectateur",
  },
  {
    id: "influencer",
    name: "Influenceur Cartoon",
    emoji: "🧑",
    description:
      "Un personnage cartoon tient ton produit et en parle directement à la caméra",
    bestFor: ["beauté", "fitness", "tech", "lifestyle", "mode"],
    scenes: 3,
    hook_style: 'L\'influenceur interpelle directement : "Tu DOIS voir ça"',
  },
  {
    id: "before_after",
    name: "Avant / Après",
    emoji: "🎭",
    description:
      "Transformation dramatique — souffrance sans le produit, bonheur avec",
    bestFor: ["santé", "beauté", "fitness", "maison", "productivité"],
    scenes: 3,
    hook_style: "Scène de souffrance exagérée qui accroche immédiatement",
  },
  {
    id: "product_demo",
    name: "Démo Produit",
    emoji: "🔬",
    description:
      "Présentation cinématographique du produit avec effets visuels style Apple",
    bestFor: ["tech", "gadgets", "électronique", "outils", "sport"],
    scenes: 3,
    hook_style: "Révélation du produit en gros plan avec musique épique",
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    emoji: "🌍",
    description:
      "Personnage cartoon qui utilise le produit dans sa vie quotidienne",
    bestFor: ["mode", "beauté", "alimentation", "sport", "maison"],
    scenes: 3,
    hook_style: "Une journée normale qui devient exceptionnelle grâce au produit",
  },
  {
    id: "absurd_problem",
    name: "Problème Absurde",
    emoji: "😂",
    description:
      "Scénario exagéré et drôle où le produit résout un problème dramatisé",
    bestFor: ["gadgets", "cuisine", "maison", "accessoires", "tout produit"],
    scenes: 3,
    hook_style:
      "Situation catastrophique absurde et drôle dès la première seconde",
  },
  {
    id: "unboxing",
    name: "Unboxing Premium",
    emoji: "👑",
    description:
      "Ouverture épique du packaging avec effets de lumière et révélation dramatique",
    bestFor: ["luxe", "tech", "mode", "bijoux", "gaming"],
    scenes: 3,
    hook_style:
      "Un colis mystérieux arrive — tout le monde veut savoir ce qu'il y a dedans",
  },
  {
    id: "testimonial",
    name: "Témoignages",
    emoji: "📱",
    description:
      "3 personnages différents témoignent chacun d'un bénéfice clé du produit",
    bestFor: ["santé", "beauté", "fitness", "tech", "tout produit"],
    scenes: 3,
    hook_style: "Statistique choc ou question rhétorique qui interpelle",
  },
];

export const TEMPLATE_SYSTEM_PROMPTS: Record<AdTemplate, string> = {
  living_product: `STYLE EXACT : Le produit lui-même prend vie (style Pixar Cars — yeux + bouche sur sa surface).

RÈGLES ABSOLUES pour le template Produit Vivant :
1. Le produit GARDE son apparence exacte à 100% (couleurs, packaging, logo, forme)
2. Yeux cartoon expressifs + bouche parlante sur la surface du produit — PAS de bras, PAS de jambes
3. Le produit parle à la 1ère personne via voiceover — bouche animée
4. AUCUN autre personnage avec un visage en arrière-plan — le produit est seul
5. On reconnaît IMMÉDIATEMENT le vrai produit

Dans les gemini_prompt : produit exact + yeux + bouche + décor contextuel, sans personnages parasites.`,

  influencer: `Un influenceur cartoon 3D Pixar (genre/apparence défini par la cible) tient et utilise le produit.
Il parle directement à la caméra comme dans une vraie vidéo UGC mais version cartoon.
Style authentique, ton naturel, comme un vrai témoignage mais en version animée.
SCÈNE 1 : L'influenceur interpelle directement "Stop ! Tu DOIS voir ça" en tenant le produit
SCÈNES 2-3 : Démonstration et bénéfices personnels partagés
SCÈNE FINALE : "Sérieusement, commande maintenant — le lien est en bio"`,

  before_after: `Structure en 3 actes ultra-dramatique :
ACTE 1 (Scène 1) : Personnage qui souffre SANS le produit — exagéré, presque comique tellement c'est dramatique
ACTE 2 (Scène 2) : La découverte du produit — révélation lumineuse, comme trouver le Saint Graal
ACTE 3 (Scènes 3+) : Transformation totale — le personnage est méconnaissable, épanoui, victorieux
Le contraste doit être MAXIMAL entre avant et après.`,

  product_demo: `Style Apple Product Launch — cinématographique, minimal, premium.
Gros plans spectaculaires du produit sous différents angles avec éclairage studio parfait.
Effets visuels qui montrent comment le produit fonctionne (rayon X, particules, coupe).
Musique épique implicite dans les descriptions visuelles.
SCÈNE 1 : Révélation lente et dramatique du produit depuis le noir
SCÈNES 2-3 : Zoom sur les détails et fonctionnalités clés avec effets visuels
SCÈNE FINALE : Produit en pleine lumière + prix/CTA style Apple`,

  lifestyle: `Personnage cartoon attachant dans 3-4 situations de sa vie quotidienne,
le produit intégré naturellement dans chaque moment de façon positive.
Ton chaleureux, authentique, aspirationnel — on veut vivre cette vie.
Chaque scène = un moment de vie différent (matin, travail, sport, soirée)`,

  absurd_problem: `Scénario complètement délirant et exagéré — style brain rot TikTok.
Le problème est ridiculement dramatisé (comme si c'était une catastrophe mondiale).
Le produit résout tout de façon magique et instantanée.
Personnages expressifs au maximum, situations improbables, humour absurde.
SCÈNE 1 : Catastrophe absurde — le personnage est dans une situation ridicule et dramatique
SCÈNE 2 : Révélation du produit comme LA solution à tous les problèmes  
SCÈNE 3 : Résolution magique — le personnage est sauvé et triomphant
SCÈNE FINALE : "Le seul truc qui marche vraiment — commande maintenant"`,

  unboxing: `Traiter l'unboxing comme un événement épique et hype.
Un personnage cartoon reçoit le colis avec une excitation intense et théâtrale.
L'ouverture est filmée au ralenti avec des effets de lumière et de particules dorées.
Le produit est révélé comme un trésor — effets de lumière divine.
SCÈNE 1 : Arrivée du colis — le personnage est en mode hype totale
SCÈNE 2 : Ouverture lente et dramatique avec effets lumineux
SCÈNE 3 : Révélation du produit — lumière divine, particules dorées, réaction euphorique
SCÈNE FINALE : Le personnage montre le produit face caméra, rayonnant`,

  testimonial: `3 personnages cartoon TRÈS différents (âge, style, situation) témoignent chacun d'UN bénéfice.
Chaque témoignage = une scène courte et punchy.
Format : bulle de dialogue + personnage expressif + texte du bénéfice à l'écran.
SCÈNE 1 : Hook statistique choc OU question qui interpelle
SCÈNES 2-4 : Un témoignage par scène, bénéfice différent à chaque fois
SCÈNE FINALE : Les 3 personnages ensemble + CTA fort`,
};

export function getTemplateConfig(id: AdTemplate): AdTemplateConfig {
  return AD_TEMPLATES.find((t) => t.id === id) ?? AD_TEMPLATES[0];
}
