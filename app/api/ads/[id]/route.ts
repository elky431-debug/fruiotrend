import { NextRequest, NextResponse } from "next/server";
import {
  getSignedAssetUrl,
  getSupabase,
  hasSupabaseStorageEnv,
} from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!hasSupabaseStorageEnv) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Pub non trouvée" }, { status: 404 });
  }

  const scenes = Array.isArray(data.scenes)
    ? await Promise.all(
        data.scenes.map(async (scene: Record<string, string>) => ({
          ...scene,
          imageUrl: scene.imagePath
            ? (await getSignedAssetUrl("ad-scenes", scene.imagePath)) || scene.imageUrl
            : scene.imageUrl,
          videoUrl: scene.videoPath
            ? (await getSignedAssetUrl("ad-videos", scene.videoPath)) || scene.videoUrl
            : scene.videoUrl,
          audioUrl: scene.audioPath
            ? (await getSignedAssetUrl("ad-audio", scene.audioPath)) || scene.audioUrl
            : scene.audioUrl,
        }))
      )
    : [];

  const finalVideoUrl = data.final_video_path
    ? (await getSignedAssetUrl("ad-finals", data.final_video_path)) ||
      data.final_video_url
    : data.final_video_url;

  return NextResponse.json({
    ad: {
      ...data,
      scenes,
      final_video_url: finalVideoUrl,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!hasSupabaseStorageEnv) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const supabase = getSupabase();
  const buckets = [
    "product-images",
    "ad-scenes",
    "ad-videos",
    "ad-audio",
    "ad-finals",
  ];

  await Promise.allSettled(
    buckets.map((bucket) =>
      supabase.storage.from(bucket).list(params.id).then(({ data }) => {
        if (data?.length) {
          const paths = data.map((file) => `${params.id}/${file.name}`);
          return supabase.storage.from(bucket).remove(paths);
        }
        return Promise.resolve();
      })
    )
  );

  const { error } = await supabase.from("ads").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
