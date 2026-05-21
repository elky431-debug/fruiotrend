import { NextRequest, NextResponse } from "next/server";
import { createTextToVideo, estimateCredits, resolutionForModel } from "@/lib/nanobanan";
import { deductCredits } from "@/lib/supabase";
import type { VideoModel } from "@/types/drama";
import type { Scene } from "@/types/drama";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scene, model, userId } = body as {
      scene?: Scene;
      model?: VideoModel;
      userId?: string;
    };

    if (!scene?.video_prompt) {
      return NextResponse.json({ error: "Scène invalide" }, { status: 400 });
    }
    if (scene.video_prompt.length > 200) {
      return NextResponse.json({ error: "Prompt max 200 caractères" }, { status: 400 });
    }

    const videoModel = model ?? "nano-banana";
    const resolution = resolutionForModel(videoModel);
    const creditsNeeded = estimateCredits(resolution, 5);

    if (userId) {
      const check = await deductCredits(userId, creditsNeeded);
      if (!check.success) {
        return NextResponse.json(
          { error: check.error, remaining: check.remaining },
          { status: 402 }
        );
      }
    }

    const result = await createTextToVideo({
      prompt: scene.video_prompt,
      resolution,
      duration: 5,
      aspect_ratio: "9:16",
      model: videoModel,
    });

    return NextResponse.json({
      video_id: result.video_id,
      video_url: result.video_url,
      status: result.status,
      creditsUsed: creditsNeeded,
    });
  } catch (err) {
    console.error("generate-video:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération vidéo" },
      { status: 500 }
    );
  }
}
