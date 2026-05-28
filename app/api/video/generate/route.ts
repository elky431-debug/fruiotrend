import { NextRequest, NextResponse } from "next/server";
import {
  buildVideoInput,
  extractVideoUrl,
  parseFalBillingError,
  resolveFalImageUrl,
  VIDEO_RUN,
} from "@/lib/klingFal";

/** Appel synchrone fal.run — pas de polling, LTX 2.3 Fast (~30–90s) */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt, durationSeconds, mouthExpression } =
      await req.json();
    const apiKey = process.env.FAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "FAL_API_KEY manquante" },
        { status: 500 }
      );
    }

    const started = Date.now();
    const finalImageUrl = await resolveFalImageUrl(
      apiKey,
      imageUrl,
      imageBase64
    );
    console.log(
      `[VIDEO/GENERATE] Image prête en ${Date.now() - started}ms — LTX 2.3 Fast sync...`
    );

    const falRes = await fetch(VIDEO_RUN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(
        buildVideoInput(
          finalImageUrl,
          prompt ||
            "Pixar 3D product ad, subtle camera move, 9:16 vertical, cinematic",
          durationSeconds,
          mouthExpression
        )
      ),
    });

    const falText = await falRes.text();
    const billingErr = parseFalBillingError(falText);

    if (!falRes.ok) {
      console.error("[VIDEO/GENERATE] Erreur:", falText.slice(0, 400));
      return NextResponse.json(
        {
          error:
            billingErr ||
            `fal.ai erreur (${falRes.status}): ${falText.slice(0, 300)}`,
        },
        { status: billingErr ? 402 : 500 }
      );
    }

    let falData: unknown;
    try {
      falData = JSON.parse(falText);
    } catch {
      return NextResponse.json(
        { error: "Réponse fal.ai invalide" },
        { status: 500 }
      );
    }

    const videoUrl = extractVideoUrl(falData);
    if (!videoUrl) {
      console.error(
        "[VIDEO/GENERATE] Pas d'URL:",
        falText.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Vidéo générée mais URL introuvable" },
        { status: 500 }
      );
    }

    const totalMs = Date.now() - started;
    console.log(`[VIDEO/GENERATE] ✅ ${totalMs}ms — ${videoUrl.slice(0, 55)}`);

    return NextResponse.json({ videoUrl, durationMs: totalMs });
  } catch (error) {
    console.error("[VIDEO/GENERATE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur génération vidéo",
      },
      { status: 500 }
    );
  }
}
