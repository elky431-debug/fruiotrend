import { NextRequest, NextResponse } from "next/server";
import { requireCredits, requireCreditsMulti } from "@/lib/apiCredits";
import { usesHumanPresenter } from "@/lib/adTemplates";
import type { AdTemplate } from "@/types/ad";
import {
  enrichVideoPrompt,
  mapVideoDurationSeconds,
  parseFalBillingError,
  resolveFalImageUrl,
  VIDEO_CAMERA_AUDIO_RULES,
  VIDEO_QUEUE,
} from "@/lib/klingFal";

export const maxDuration = 60;

const PRODUCT_INTEGRITY_RULES = `

==== ABSOLUTE PRODUCT INTEGRITY RULES ====

SHAPE:
- The product shape in the OUTPUT must be 100% IDENTICAL to the INPUT IMAGE
- Count the parts in the input image — reproduce EXACTLY that many parts
- ONE massage head = ONE head. NOT two. NOT three.
- ONE handle = ONE handle. NOT mirrored. NOT duplicated.
- Do NOT add symmetry where there is none in the original
- Do NOT add attachments, extensions, or extra elements not in the original
- Do NOT merge, split, or reshape any part of the product

ANATOMY OF THIS SPECIFIC PRODUCT:
- Study the input image carefully before animating
- Identify every distinct part and its exact position
- Keep every part in its exact original position throughout ALL frames
- The product silhouette must match the input image at frame 1, frame 50, and frame 200

MOVEMENT ALLOWED:
- Subtle floating/hovering in place
- Slight tilting left or right (max 15 degrees)
- Eyes blinking and expressing emotion
- Mouth opening and closing naturally
- Subtle breathing-like movement

MOVEMENT FORBIDDEN:
- Growing new parts during animation
- Duplicating existing parts
- Mirroring asymmetric parts
- Morphing the shape
- Adding limbs, arms, legs, or any appendages not in the original image

CONSISTENCY CHECK:
- Frame 1: product looks like the input image ✓
- Frame 50: product still looks like the input image ✓  
- Last frame: product still looks like the input image ✓
- If any frame shows a different shape → the generation is WRONG

==== END OF RULES ====`;

/** Fallback queue (si /generate timeout) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const regenerate = Boolean((body as { regenerate?: boolean }).regenerate);

    const creditGuard = regenerate
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
        { error: "FAL_API_KEY manquante" },
        { status: 500 }
      );
    }

    const finalImageUrl = await resolveFalImageUrl(
      apiKey,
      imageUrl,
      imageBase64
    );

    const humanPresenter =
      template === "influencer" ||
      (template && usesHumanPresenter(template as AdTemplate));

    console.log(
      "[VIDEO/START] LTX 2.3 Fast (queue)...",
      humanPresenter ? "humanPresenter+anatomy" : ""
    );

    const basePrompt =
      prompt || "Pixar 3D product ad, 9:16 vertical, cinematic";

    const audioOpts = {
      voiceover: voiceover ? String(voiceover) : undefined,
      voiceStyle: voiceStyle ? String(voiceStyle) : undefined,
      language: "French" as const,
      humanPresenter,
    };

    const finalPrompt = humanPresenter
      ? enrichVideoPrompt(basePrompt, {
          mouthExpression,
          ...audioOpts,
        })
      : `${basePrompt}${PRODUCT_INTEGRITY_RULES}${
          voiceover
            ? `\n\nVoiceover in French (${voiceStyle || "warm natural"}): "${String(voiceover).slice(0, 200)}". Lip-sync mouth: ${mouthExpression || "open mouth speaking"}.`
            : ""
        }${VIDEO_CAMERA_AUDIO_RULES}`;

    const falRes = await fetch(VIDEO_QUEUE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: finalImageUrl,
        prompt: finalPrompt,
        duration: mapVideoDurationSeconds(durationSeconds),
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
