import { NextRequest, NextResponse } from "next/server";
import {
  buildVideoInput,
  parseFalBillingError,
  resolveFalImageUrl,
  VIDEO_QUEUE,
} from "@/lib/klingFal";

export const maxDuration = 60;

/** Fallback queue (si /generate timeout) */
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

    const finalImageUrl = await resolveFalImageUrl(
      apiKey,
      imageUrl,
      imageBase64
    );

    console.log("[VIDEO/START] LTX 2.3 Fast (queue)...");

    const falRes = await fetch(VIDEO_QUEUE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(
        buildVideoInput(
          finalImageUrl,
          prompt || "Pixar 3D product ad, 9:16 vertical",
          durationSeconds,
          mouthExpression
        )
      ),
    });

    const falText = await falRes.text();
    const billingErr = parseFalBillingError(falText);
    if (!falRes.ok) {
      return NextResponse.json(
        {
          error:
            billingErr ||
            `fal.ai erreur (${falRes.status}): ${falText.slice(0, 300)}`,
        },
        { status: billingErr ? 402 : 500 }
      );
    }

    const falData = JSON.parse(falText) as { request_id?: string };
    const requestId = falData.request_id;
    if (!requestId) {
      return NextResponse.json({ error: "Pas de request_id" }, { status: 500 });
    }

    return NextResponse.json({ requestId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur démarrage vidéo",
      },
      { status: 500 }
    );
  }
}
