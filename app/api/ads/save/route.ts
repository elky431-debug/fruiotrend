import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabase,
  hasSupabaseStorageEnv,
  uploadBase64,
  uploadDataUrl,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    if (!hasSupabaseStorageEnv) {
      return NextResponse.json(
        {
          error:
            "Variables Supabase manquantes. Vérifie NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = getSupabase();
    const {
      title,
      hook,
      cta,
      productName,
      template,
      script,
      scenes,
      finalVideoUrl,
      productImages,
      productImagesMimeType,
      userId,
    } = await req.json();

    const adId = randomUUID();
    const uploadTasks: Promise<void>[] = [];
    const storedScenes = JSON.parse(JSON.stringify(scenes || []));

    if (Array.isArray(productImages) && productImages.length) {
      for (let i = 0; i < productImages.length; i++) {
        uploadTasks.push(
          uploadBase64(
            "product-images",
            `${adId}/photo_${i}.jpg`,
            productImages[i],
            productImagesMimeType?.[i] || "image/jpeg"
          ).then((url) => {
            if (storedScenes[0]) {
              storedScenes[0].productPhotoUrl = url;
              storedScenes[0].productPhotoPath = `${adId}/photo_${i}.jpg`;
            }
          })
        );
      }
    }

    for (let i = 0; i < storedScenes.length; i++) {
      const scene = storedScenes[i];

      if (scene.imageUrl) {
        uploadTasks.push(
          uploadDataUrl(
            "ad-scenes",
            `${adId}/scene_${scene.number}.jpg`,
            scene.imageUrl,
            "image/jpeg"
          ).then((url) => {
            storedScenes[i].imageUrl = url || scene.imageUrl;
            storedScenes[i].imagePath = `${adId}/scene_${scene.number}.jpg`;
          })
        );
      }

      if (scene.videoUrl) {
        uploadTasks.push(
          uploadDataUrl(
            "ad-videos",
            `${adId}/scene_${scene.number}.mp4`,
            scene.videoUrl,
            "video/mp4"
          ).then((url) => {
            storedScenes[i].videoUrl = url || scene.videoUrl;
            storedScenes[i].videoPath = `${adId}/scene_${scene.number}.mp4`;
          })
        );
      }

      if (scene.audioUrl) {
        uploadTasks.push(
          uploadDataUrl(
            "ad-audio",
            `${adId}/scene_${scene.number}.mp3`,
            scene.audioUrl,
            "audio/mp3"
          ).then((url) => {
            storedScenes[i].audioUrl = url || scene.audioUrl;
            storedScenes[i].audioPath = `${adId}/scene_${scene.number}.mp3`;
          })
        );
      }
    }

    let storedFinalVideoUrl = finalVideoUrl;
    let storedFinalVideoPath: string | null = null;

    if (finalVideoUrl) {
      uploadTasks.push(
        uploadDataUrl("ad-finals", `${adId}/final.mp4`, finalVideoUrl, "video/mp4").then(
          (url) => {
            storedFinalVideoUrl = url || finalVideoUrl;
            storedFinalVideoPath = `${adId}/final.mp4`;
          }
        )
      );
    }

    await Promise.allSettled(uploadTasks);

    const { data, error } = await supabase
      .from("ads")
      .insert({
        id: adId,
        user_id: userId || null,
        title,
        hook,
        cta,
        product_name: productName,
        template,
        script,
        scenes: storedScenes,
        final_video_url: storedFinalVideoUrl,
        final_video_path: storedFinalVideoPath,
        status: finalVideoUrl ? "completed" : "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: adId, success: true, ad: data });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Erreur sauvegarde pub",
      },
      { status: 500 }
    );
  }
}
