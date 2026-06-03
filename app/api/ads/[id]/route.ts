import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-api";
import {
  getSignedAssetUrl,
  getSupabase,
  hasSupabaseStorageEnv,
} from "@/lib/storage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!hasSupabaseStorageEnv) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const resolvedUserId = await getApiUserId(req);
  if (!resolvedUserId || !UUID_RE.test(resolvedUserId)) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", resolvedUserId)
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!hasSupabaseStorageEnv) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const resolvedUserId = await getApiUserId(req);
  if (!resolvedUserId || !UUID_RE.test(resolvedUserId)) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Vérifie la propriété avant toute suppression de fichiers.
  const { data: owned } = await supabase
    .from("ads")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", resolvedUserId)
    .single();

  if (!owned) {
    return NextResponse.json({ error: "Pub non trouvée" }, { status: 404 });
  }

  const buckets = [
    "product-images",
    "ad-scenes",
    "ad-videos",
    "ad-audio",
    "ad-finals",
  ];

  await Promise.allSettled(
    buckets.map(async (bucket) => {
      const { data } = await supabase.storage.from(bucket).list(params.id);
      if (data?.length) {
        const paths = data.map((file) => `${params.id}/${file.name}`);
        await supabase.storage.from(bucket).remove(paths);
      }
    })
  );

  const { error } = await supabase
    .from("ads")
    .delete()
    .eq("id", params.id)
    .eq("user_id", resolvedUserId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
