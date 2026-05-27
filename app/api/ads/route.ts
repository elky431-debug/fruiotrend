import { NextRequest, NextResponse } from "next/server";
import {
  getSignedAssetUrl,
  getSupabase,
  hasSupabaseStorageEnv,
} from "@/lib/storage";

type DbScene = {
  imageUrl?: string;
  imagePath?: string;
  videoUrl?: string;
  videoPath?: string;
  audioUrl?: string;
  audioPath?: string;
};

type DbAd = {
  id: string;
  title: string;
  hook?: string;
  product_name?: string;
  template?: string;
  scenes?: DbScene[];
  final_video_url?: string | null;
  final_video_path?: string | null;
  status?: string;
  created_at?: string;
};

async function hydrateSceneAssets(scene: DbScene) {
  const next = { ...scene };

  if (scene.imagePath) {
    next.imageUrl = (await getSignedAssetUrl("ad-scenes", scene.imagePath)) || scene.imageUrl;
  }
  if (scene.videoPath) {
    next.videoUrl = (await getSignedAssetUrl("ad-videos", scene.videoPath)) || scene.videoUrl;
  }
  if (scene.audioPath) {
    next.audioUrl = (await getSignedAssetUrl("ad-audio", scene.audioPath)) || scene.audioUrl;
  }

  return next;
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseStorageEnv) {
    return NextResponse.json({ ads: [] });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  let query = supabase
    .from("ads")
    .select(
      "id, title, hook, product_name, template, scenes, final_video_url, final_video_path, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ads = await Promise.all(
    (data || []).map(async (ad) => {
      const dbAd = ad as DbAd;
      const scenes = Array.isArray(dbAd.scenes)
        ? await Promise.all(dbAd.scenes.map((scene) => hydrateSceneAssets(scene)))
        : [];

      const finalVideoUrl =
        dbAd.final_video_path
          ? await getSignedAssetUrl("ad-finals", dbAd.final_video_path)
          : dbAd.final_video_url || null;

      return {
        ...dbAd,
        scenes,
        final_video_url: finalVideoUrl,
      };
    })
  );

  return NextResponse.json({ ads });
}
