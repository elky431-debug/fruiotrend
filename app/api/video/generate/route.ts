import { NextRequest, NextResponse } from "next/server";
import { requireCredits, requireCreditsMulti } from "@/lib/apiCredits";
import { usesHumanPresenter } from "@/lib/adTemplates";
import type { AdTemplate } from "@/types/ad";
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
    const body = await req.json();
    const regenerate = Boolean((body as { regenerate?: boolean }).regenerate);
    // Segment supplémentaire d'une même scène longue (>20s) : on ne débite que
    // la vidéo (la voix + le lip sync ne sont facturés qu'une fois par scène).
    const segmentExtra = Boolean((body as { segmentExtra?: boolean }).segmentExtra);

    const creditGuard = segmentExtra
      ? await requireCredits(req, "video")
      : regenerate
        ? await requireCredits(req, "video", { regenerate: true })
        : await requireCreditsMulti(req, ["video", "voice", "lipsync"]);
    if (creditGuard instanceof NextResponse) return creditGuard;

    const {
      imageUrl,
      imageBase64,
      prompt,
      durationSeconds,
      mouthExpression,
      voiceover,
      voiceStyle,
      template,
    } = body;
    const apiKey = process.env.FAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Service vidéo PubMoi indisponible. Réessaie plus tard." },
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
      `[VIDEO/GENERATE] Image prête en ${Date.now() - started}ms — LTX 2.3 Fast (vidéo muette)...`
    );
    if (voiceover) {
      console.log("[VIDEO/GENERATE] Voiceover:", String(voiceover).slice(0, 80));
    }

    const humanPresenter =
      template === "influencer" ||
      (template && usesHumanPresenter(template as AdTemplate));

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
            "Pixar 3D product ad, static camera, 9:16 vertical, cinematic",
          durationSeconds,
          mouthExpression,
          {
            voiceover: voiceover ? String(voiceover) : undefined,
            voiceStyle: voiceStyle ? String(voiceStyle) : undefined,
            language: "French",
            humanPresenter,
          }
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
            "Erreur lors de la génération vidéo PubMoi. Réessaie dans quelques instants.",
        },
        { status: billingErr ? 402 : 500 }
      );
    }

    let falData: unknown;
    try {
      falData = JSON.parse(falText);
    } catch {
      return NextResponse.json(
        { error: "Erreur lors de la génération vidéo PubMoi. Réessaie." },
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

    return NextResponse.json({
      videoUrl,
      durationMs: totalMs,
      embeddedAudio: false,
      provider: "pubmoi-video",
    });
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
