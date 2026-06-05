import { NextRequest, NextResponse } from "next/server";
import { FRUIT_CHARACTERS } from "@/lib/storyThemes";
import { WOJAK_CONFIG } from "@/lib/wojakConfig";
import { requireCredits } from "@/lib/apiCredits";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const creditGuard = await requireCredits(req, "script");
    if (creditGuard instanceof NextResponse) return creditGuard;

    const body = await req.json();
    const {
      theme,
      fruit1,
      fruit2,
      wojak_profile,
      storyIdea,
      productName,
      productDescription,
      productType,
    } = body as {
      theme?: string;
      fruit1?: string;
      fruit2?: string;
      wojak_profile?: string;
      storyIdea?: string;
      productName?: string;
      productDescription?: string;
      productType?: "product" | "app";
    };

    if (!theme || !productName?.trim() || !productDescription?.trim()) {
      return NextResponse.json(
        { error: "Thème, nom et description requis." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Service script PubMoi indisponible." },
        { status: 500 }
      );
    }

    const isApp = productType === "app";
    const fruit1Data = FRUIT_CHARACTERS.find((f) => f.id === fruit1);
    const fruit2Data = FRUIT_CHARACTERS.find((f) => f.id === fruit2);

    const productPlacement = isApp
      ? `PLACEMENT APPLI : Dans la scène solution, le personnage tient un smartphone
       face caméra montrant l'interface de l'appli "${productName}".
       L'écran du téléphone affiche clairement l'UI de l'appli.`
      : `PLACEMENT PRODUIT : Dans la scène solution, le personnage tient physiquement
       le produit "${productName}" dans ses mains, bien visible face caméra.
       Le packaging/produit est reconnaissable et clairement montré.`;

    const { nScenes: wojakScenes, secondsPerScene, wordsPerScene } = WOJAK_CONFIG;

    const systemPrompt =
      theme === "wojak"
        ? `Tu es un scénariste expert en vidéos Wojak virales TikTok.
Tu crées des micro-histoires en 3 ACTES avec une vraie tension narrative.

EXACTEMENT ${wojakScenes} SCÈNES — pas plus, pas moins.

STRUCTURE OBLIGATOIRE EN 3 ACTES :

ACTE 1 — LA DOULEUR (scène 1, narrative_role: "problem")
- Situation ultra-précise et reconnaissable
- Le spectateur doit se dire "c'est exactement moi"
- Pas de généralité — du concret, du spécifique
- Ambiance sombre, froide, lumière bleue/grise
- Produit ABSENT — on voit juste la douleur
- show_product: false

ACTE 2 — LE TOURNANT (scène 2, narrative_role: "discovery")
- Quelque chose change — il découvre le produit "${productName}"
- Moment de bascule — pas encore la solution, juste la découverte
- Le produit est mentionné dans la narration mais PAS encore tenu
- Ambiance neutre qui commence à changer
- show_product: false

ACTE 3 — LA TRANSFORMATION (scène 3, narrative_role: "solution")
- Le produit est tenu face caméra, clairement visible
- ${
  isApp
    ? `Le personnage tient un smartphone montrant l'interface de "${productName}".`
    : `Le personnage tient physiquement "${productName}" dans ses mains, packaging visible.`
}
- Résultat concret et mesurable dans la narration
- Ambiance chaude, lumineuse, positive
- show_product: true
- La narration DOIT citer le nom "${productName}"

RÈGLES DU NARRATEUR EXTERNE :
- Toujours à la 3ème personne : "Il", "Elle" — jamais "Je"
- Phrases TRÈS courtes — 4 à 7 mots max par phrase
- Ton froid, factuel, légèrement ironique
- Aucune émotion expliquée — juste les faits
- Le spectateur ressent, le narrateur constate
- Aucun tag émotionnel dans le texte

EXEMPLES DE BON STYLE NARRATEUR :
✅ "3h du matin. Encore debout."
✅ "Les notes s'accumulent. Il comprend rien."
✅ "Un ami lui parle de ${productName}."
✅ "Il essaie. Une semaine passe."
✅ "Il regarde dans le miroir. Différent."

EXEMPLES INTERDITS :
❌ "Je suis tellement fatigué" (1ère personne)
❌ "Il se sent désespéré et triste" (émotion expliquée)
❌ "Ce produit incroyable va tout changer" (marketing)
❌ Phrases de plus de 8 mots

CALCUL DURÉE :
- ${wojakScenes} scènes obligatoires pour atteindre ${WOJAK_CONFIG.minTotalDuration}s minimum
- Chaque scène = ${secondsPerScene} secondes de vidéo
- Chaque voiceover = ${wordsPerScene} mots max (à 2.3 mots/sec = ~${secondsPerScene}s)

${storyIdea ? `IDÉE USER : ${storyIdea}` : "Invente une histoire originale avec vraie tension."}
PRODUIT : ${productName} — ${productDescription}

IMPORTANT visual_description :
- EN ANGLAIS — décor photoréaliste SANS personnage, SANS humain
- Décris uniquement l'environnement, la lumière, les objets
- PAS de Wojak, PAS de personnage dans visual_description

FORMAT JSON OBLIGATOIRE :
{
  "title": "TITRE EN 4 MOTS MAX",
  "theme": "wojak",
  "scenes": [
    {
      "id": 1,
      "index": 0,
      "role": "problem",
      "narrative_role": "problem",
      "voiceover": "Texte narrateur 3ème personne, max ${wordsPerScene} mots",
      "visual_description": "EN ANGLAIS — décor photoréaliste vide, ambiance froide/sombre, SANS personne",
      "character_pose": "EN ANGLAIS — posture wojak : dos voûté, épaules basses, regarde le sol",
      "background": "EN ANGLAIS — même décor que visual_description",
      "show_product": false,
      "duration_seconds": ${secondsPerScene}
    },
    {
      "id": 2,
      "index": 1,
      "role": "discovery",
      "narrative_role": "discovery",
      "voiceover": "Texte narrateur mentionnant ${productName}, max ${wordsPerScene} mots",
      "visual_description": "EN ANGLAIS — décor photoréaliste vide, lumière qui change, SANS personne",
      "character_pose": "EN ANGLAIS — assis, téléphone en main, expression intriguée",
      "background": "EN ANGLAIS — même décor, lumière plus neutre",
      "show_product": false,
      "duration_seconds": ${secondsPerScene}
    },
    {
      "id": 3,
      "index": 2,
      "role": "solution",
      "narrative_role": "solution",
      "voiceover": "Texte narrateur avec nom ${productName}, max ${wordsPerScene} mots",
      "visual_description": "EN ANGLAIS — décor photoréaliste chaud et lumineux, SANS personne",
      "character_pose": "EN ANGLAIS — debout droit, confiant, tient le produit face caméra",
      "background": "EN ANGLAIS — même lieu, ambiance chaleureuse",
      "show_product": true,
      "duration_seconds": ${secondsPerScene}
    }
  ]
}`
        : `
Tu génères des histoires courtes virales style Fruit Drama TikTok.
EXACTEMENT 2 SCÈNES — court-métrage dramatique, vraie intrigue.

SCÈNE 1 — MISE EN PLACE + CONFLIT :
Situation dramatique entre les 2 personnages fruits.
${isApp ? `L'appli "${productName}" est visible sur un écran ou smartphone dans le décor.` : `Le produit "${productName}" est visible dans le décor.`}
Sous-titre percutant qui donne envie de voir la suite.

SCÈNE 2 — RETOURNEMENT + SOLUTION :
${productPlacement}
Twist dramatique — le personnage principal utilise "${productName}" comme solution.
Fin satisfaisante mais qui peut laisser sur sa faim.

PERSONNAGES :
- ${fruit1Data?.emoji ?? "🍌"} ${fruit1Data?.name ?? "Fruit"} (principal) : ${fruit1Data?.personality ?? ""}
- ${fruit2Data?.emoji ?? "🍓"} ${fruit2Data?.name ?? "Fruit"} (secondaire) : ${fruit2Data?.personality ?? ""}

${storyIdea ? `IDÉE USER : ${storyIdea}` : "Invente une intrigue originale et accrocheuse avec un vrai twist."}
PRODUIT : ${productName} — ${productDescription}

IMPORTANT: Dans les champs "subtitle", utilise uniquement du texte brut.
JAMAIS de ** ou * ou markdown. Texte en majuscules sans formatage.

FORMAT JSON :
{
  "title": "TITRE EN 4 MOTS MAX",
  "theme": "fruit-drama",
  "scenes": [
    {
      "index": 0,
      "role": "setup",
      "subtitle": "TEXTE BLANC — MAX 4 MOTS",
      "subtitle_color": "white",
      "visual_description": "Description EN ANGLAIS — Pixar 3D, têtes de fruits sur corps humains, décor cinématographique",
      "background": "Décor EN ANGLAIS — photoréaliste cinématographique, éclairage dramatique",
      "duration_seconds": 7
    },
    {
      "index": 1,
      "role": "solution",
      "subtitle": "TEXTE BLANC — MAX 4 MOTS",
      "subtitle_color": "white",
      "visual_description": "Description EN ANGLAIS — personnage principal tient ${isApp ? "smartphone montrant l'interface de l'appli" : "le produit bien visible"}",
      "background": "Décor EN ANGLAIS — même univers, ambiance différente",
      "duration_seconds": 7
    }
  ]
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1200,
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Génère une histoire en EXACTEMENT ${theme === "wojak" ? wojakScenes : 2} scènes pour "${productName}". Histoire originale avec vraie tension narrative.`,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur OpenAI" },
        { status: 500 }
      );
    }

    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Histoire invalide" }, { status: 500 });
    }

    const story = JSON.parse(jsonMatch[0]) as Record<string, unknown> & {
      scenes?: Array<Record<string, unknown>>;
    };
    story.productType = productType;
    story.isApp = isApp;

    if (Array.isArray(story.scenes)) {
      story.scenes = story.scenes.map((s, i) => {
        const narrativeRole =
          String(s.narrative_role || s.role || "").trim() ||
          (i === 2 ? "solution" : i === 1 ? "discovery" : "problem");

        return {
          ...s,
          id: i + 1,
          index: i,
          voiceover: String(s.voiceover || "")
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/\[.*?\]/g, "")
            .trim(),
          narrative_role: narrativeRole,
          role: narrativeRole,
          show_product:
            s.show_product === true || narrativeRole === "solution",
          duration_seconds:
            theme === "wojak"
              ? Number(s.duration_seconds) || WOJAK_CONFIG.secondsPerScene
              : Number(s.duration_seconds) || 7,
          subtitle: theme === "wojak" ? "" : String(s.subtitle || "")
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .trim()
            .toUpperCase(),
        };
      });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("[STORY]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur génération histoire",
      },
      { status: 500 }
    );
  }
}
