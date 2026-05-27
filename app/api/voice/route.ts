import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const VOICES = {
  feminine_warm: "Aoede",
  feminine_clear: "Leda",
  masculine_deep: "Orus",
  masculine_young: "Puck",
  neutral: "Charon",
};

export async function POST(req: NextRequest) {
  try {
    const { text, emotion, productCategory, gender } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY manquante" },
        { status: 500 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Texte manquant" },
        { status: 400 }
      );
    }

    let voiceName = VOICES.feminine_warm;
    if (gender === "male") {
      voiceName = VOICES.masculine_deep;
    } else if (productCategory === "sport" || productCategory === "tech") {
      voiceName =
        gender === "male" ? VOICES.masculine_young : VOICES.feminine_clear;
    }

    let styledText = text;
    if (emotion === "excited" || emotion === "energetic") {
      styledText = `[excited] ${text}`;
    } else if (emotion === "whisper" || emotion === "intimate") {
      styledText = `[whispers] ${text}`;
    } else if (emotion === "dramatic" || emotion === "sad") {
      styledText = `[sad] ${text}`;
    } else if (emotion === "happy") {
      styledText = `[happy] ${text}`;
    }

    console.log(
      "[VOICE] Génération Gemini TTS:",
      voiceName,
      styledText.substring(0, 50)
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: styledText }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[VOICE] Erreur Gemini TTS:", err);
      return NextResponse.json(
        { error: `Gemini TTS erreur: ${err}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const audioBase64 =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioBase64) {
      console.error(
        "[VOICE] Pas d'audio retourné:",
        JSON.stringify(data).substring(0, 200)
      );
      return NextResponse.json(
        { error: "Pas d'audio retourné par Gemini" },
        { status: 500 }
      );
    }

    console.log("[VOICE] Audio généré avec succès");
    return NextResponse.json({ audioBase64, mimeType: "audio/wav" });
  } catch (error) {
    console.error("[VOICE] Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur voix" },
      { status: 500 }
    );
  }
}
