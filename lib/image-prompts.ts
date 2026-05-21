export interface CharacterPromptInput {
  name: string;
  type: string;
  gender: "homme" | "femme";
  outfit: string;
  personality?: string;
  color?: string;
}

export interface ScenePromptInput {
  setting: string;
  emotion: string;
  characters: Array<{
    name: string;
    type: string;
    gender: "homme" | "femme";
    outfit: string;
  }>;
  action: string;
  narrative_beat?: string;
}

const FRUIT_TEXTURES: Record<string, string> = {
  fraise:
    "strawberry head with realistic red skin covered in tiny seeds, green leafy crown on top, smooth shiny surface",
  mangue:
    "mango head with realistic golden-orange skin, slight green patches, smooth tropical fruit texture",
  banane:
    "banana head with realistic yellow curved shape, subtle brown spots, fibrous yellow skin texture",
  cerise:
    "cherry head with realistic deep red glossy skin, small green stem on top, plump round shape",
  citron:
    "lemon head with realistic bright yellow bumpy skin, pointed ends, citrus peel texture",
  raisin:
    "grape head with realistic purple-red smooth glossy skin, slightly translucent, round plump shape",
  ananas:
    "pineapple head with realistic rough diamond-pattern skin, spiky green crown, golden-yellow texture",
  pastèque:
    "watermelon head with realistic green striped rind, round heavy shape, matte surface",
  pasteque:
    "watermelon head with realistic green striped rind, round heavy shape, matte surface",
  pêche:
    "peach head with realistic soft velvety orange-pink skin, slight fuzz texture, natural crease",
  peche:
    "peach head with realistic soft velvety orange-pink skin, slight fuzz texture, natural crease",
  pomme:
    "apple head with realistic red-green waxy smooth skin, slight shine, natural dents",
  orange:
    "orange head with realistic dimpled orange peel texture, small pores, vibrant orange color",
  kiwi:
    "kiwi head with realistic brown fuzzy skin, slightly oval shape, earthy texture",
  avocat:
    "avocado head with realistic dark bumpy skin, pear shape, matte dark green texture",
  brocoli:
    "broccoli head with realistic dense green florets texture, dark green color, rough surface",
  carotte:
    "carrot head with realistic orange tapered shape, slight ridges, green feathery top",
  tomate:
    "tomato head with realistic smooth red skin, slight glossy shine, natural dents at crown",
  oignon:
    "onion head with realistic papery dry skin layers, cream and purple tones, layered texture",
  chocolat:
    "chocolate bar head with realistic dark brown molded squares, matte cocoa finish, sharp edges",
  beurre:
    "stick of butter head with realistic pale yellow waxy surface, paper wrapper around body",
  cookie:
    "cookie head with realistic golden-brown baked texture, chocolate chip spots, crinkled edges",
};

function fruitTexture(type: string, short = false): string {
  const key = type.toLowerCase().trim();
  if (FRUIT_TEXTURES[key]) {
    return FRUIT_TEXTURES[key];
  }
  if (short) {
    return `realistic ${type} head`;
  }
  return `${type} head with realistic fruit skin texture, natural color and surface details`;
}

export function buildCharacterSheetPrompt(char: CharacterPromptInput): string {
  const fruitDesc = fruitTexture(char.type);

  const bodyDesc =
    char.gender === "femme"
      ? "realistic human female body with natural proportions, average build, not muscular"
      : "realistic human male body with natural proportions, average adult build";

  return `Character reference sheet. Two full-body views of the exact same character side by side, separated by a thin vertical line in the center of the frame.

LEFT HALF: complete FRONT VIEW — full body from head to toe, facing directly toward camera, arms slightly away from body.
RIGHT HALF: complete BACK VIEW — full body from head to toe, turned directly away from camera, back fully visible.

White clean background. Pure studio lighting, neutral and even.

CHARACTER DESCRIPTION:
- Head: ${fruitDesc}
- The fruit head has realistic expressive human eyes, a natural human mouth with ${char.gender === "femme" ? "subtle lipstick" : "natural lips"}, and a realistic human nose integrated into the fruit skin
- Body: ${bodyDesc}
- Outfit: ${char.outfit || "casual everyday clothing with visible fabric texture, wrinkles, and wear"}
- Expression: neutral, calm, character sheet pose
- Style: photorealistic, like a real photograph, NOT cartoon, NOT 3D render, NOT animated, NOT Pixar
- Lighting: soft studio light, no harsh shadows
- Full body always visible — DO NOT crop any part of the body
- Both views show the exact same character with identical clothing and features`;
}

const LIGHTING_MAP: Record<string, string> = {
  bureau:
    "office fluorescent lighting mixed with window daylight, realistic workplace environment",
  cuisine:
    "warm kitchen lighting, steam and cooking atmosphere, lived-in home environment",
  rue: "natural outdoor daylight or golden hour sun, city street background, bokeh traffic",
  nuit: "dramatic night lighting, street lamps, moonlight, deep shadows",
  restaurant:
    "warm candlelight and ambient restaurant lighting, elegant atmosphere",
  salon: "soft home interior lighting, cozy living room atmosphere",
  chantier:
    "harsh outdoor daylight, dusty construction site, industrial atmosphere",
  plage: "bright tropical sunlight, beach atmosphere, warm golden light",
  hôpital: "cold clinical white lighting, hospital corridor, sterile atmosphere",
  hopital: "cold clinical white lighting, hospital corridor, sterile atmosphere",
};

function resolveLighting(setting: string): string {
  const lower = setting.toLowerCase();
  for (const [key, val] of Object.entries(LIGHTING_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "cinematic dramatic lighting, realistic shadows, natural atmosphere, golden hour warmth";
}

export function buildScenePrompt(scene: ScenePromptInput): string {
  const charsDesc = scene.characters
    .map((c) => {
      const headDesc = fruitTexture(c.type, true);
      const bodyDesc =
        c.gender === "femme"
          ? "realistic human female body with natural proportions"
          : "realistic human male body with natural proportions";
      return `${c.name}: ${headDesc} on a ${bodyDesc}, wearing ${c.outfit || "realistic worn clothing"}`;
    })
    .join(". ");

  const lighting = resolveLighting(scene.setting);
  const action =
    scene.action ||
    scene.narrative_beat ||
    "characters in intense dramatic confrontation";

  return `Cinematic vertical photograph, 9:16 format, photorealistic style.

CHARACTERS IN SCENE:
${charsDesc}

SETTING: ${scene.setting}
LIGHTING: ${lighting}, shallow depth of field with natural bokeh background

ACTION: ${action}

EMOTIONAL TONE: ${scene.emotion} — the characters show strong realistic facial expressions matching this emotion. The fruit heads have natural human-like eyes filled with genuine emotion.

STYLE REQUIREMENTS:
- Photorealistic, like an actual photograph or high-end film still
- NOT cartoon, NOT 3D render, NOT animated, NOT illustrated, NOT Pixar
- The fruit heads look like real fruit with human eyes and mouths seamlessly integrated
- Clothing shows realistic fabric texture, wrinkles, material details, stains and wear
- Environment looks like a real place photographed on location
- Cinematic composition with dramatic framing
- Natural realistic colors, no oversaturation

Drama level: HIGH — this is a telenovela moment. Body language is expressive and intense.`;
}

export function buildVideoPrompt(
  scene: ScenePromptInput,
  char1: CharacterPromptInput,
  char2?: CharacterPromptInput
): string {
  const descChar1 = `${char1.name} (${char1.type} head, ${char1.gender}, ${char1.outfit})`;
  const descChar2 = char2
    ? `${char2.name} (${char2.type} head, ${char2.gender}, ${char2.outfit})`
    : "";

  return `Photorealistic video clip, vertical 9:16 format, cinematic style.

CHARACTERS: ${descChar1}${char2 ? ` and ${descChar2}` : ""}.
The fruit heads are PHOTOREALISTIC — real fruit texture with human eyes and mouths. NOT cartoon, NOT 3D render.

SETTING: ${scene.setting}

ACTION (describe precisely frame by frame):
${scene.action || scene.narrative_beat || "dramatic confrontation"}

CAMERA MOVEMENT: slow dolly-in toward the characters' faces, slight handheld shake for realism.

EMOTION: ${scene.emotion} — faces show intense realistic expressions. Eyes are expressive.

STYLE: cinematic telenovela drama. Natural lighting. Realistic fabric on clothes. Real environment background with bokeh.

Duration: 4-6 seconds. No text overlays.`;
}
