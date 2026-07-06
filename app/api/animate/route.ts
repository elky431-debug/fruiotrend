import { NextRequest, NextResponse } from "next/server";
import { requireCredits } from "@/lib/apiCredits";
import { getAnimateTheme } from "@/lib/animateThemes";
import { buildAnimatePrompt } from "@/lib/animateThemes";
import { planImageMotion } from "@/lib/animateAnalysis";
import {
  appendAntiGhostPrompt,
  mapVideoDurationSeconds,
  parseFalBillingError,
  resolveFalImageUrl,
  VIDEO_QUEUE,
} from "@/lib/klingFal";

export const maxDuration = 60;

/**
 * Anime UNE image selon un thème. Réutilise l'infra vidéo fal (queue) :
 * démarre le job et renvoie requestId/statusUrl. Le client interroge ensuite
 * /api/video/status puis assemble les clips via /api/video/concat.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
      themeId?: string;
      durationSeconds?: number;
    };

    const theme = getAnimateTheme(body.themeId || "");
    if (!theme) {
      return NextResponse.json({ error: "Thème invalide" }, { status: 400 });
    }

    // Chaque clip = une génération vidéo.
    const creditGuard = await requireCredits(req, "video");
    if (creditGuard instanceof NextResponse) return creditGuard;

    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Service vidéo PubMoi indisponible. Réessaie plus tard." },
        { status: 500 }
      );
    }

    const rawBase64 =
      body.imageBase64 ||
      (body.imageUrl?.includes(",") ? body.imageUrl.split(",")[1] : "");

    // Analyse l'image pour un mouvement logique (best-effort).
    const subjectMotion = await planImageMotion(
      rawBase64,
      body.mimeType || "image/jpeg",
      theme
    );

    const finalImageUrl = await resolveFalImageUrl(
      apiKey,
      body.imageUrl,
      body.imageBase64
    );

    const prompt = appendAntiGhostPrompt(
      buildAnimatePrompt(theme, subjectMotion)
    );

    const falRes = await fetch(VIDEO_QUEUE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: finalImageUrl,
        prompt,
        duration: mapVideoDurationSeconds(body.durationSeconds),
        aspect_ratio: "9:16",
        resolution: "1080p",
        fps: 24,
        generate_audio: false,
      }),
    });

    const falText = await falRes.text();
    const billingErr = parseFalBillingError(falText);
    if (!falRes.ok) {
      return NextResponse.json(
        {
          error:
            billingErr ||
            "Erreur lors de la génération vidéo PubMoi. Réessaie dans quelques instants.",
        },
        { status: billingErr ? 402 : 500 }
      );
    }

    const falData = JSON.parse(falText) as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    if (!falData.request_id) {
      return NextResponse.json({ error: "Pas de request_id" }, { status: 500 });
    }

    return NextResponse.json({
      requestId: falData.request_id,
      statusUrl: falData.status_url,
      responseUrl: falData.response_url,
      motion: subjectMotion,
    });
  } catch (error) {
    console.error("[ANIMATE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur animation image",
      },
      { status: 500 }
    );
  }
}
