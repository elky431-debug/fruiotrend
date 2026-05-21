import { NextRequest, NextResponse } from "next/server";
import { getVideoStatus } from "@/lib/nanobanan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const videoId = req.nextUrl.searchParams.get("video_id");
    if (!videoId) {
      return NextResponse.json({ error: "video_id requis" }, { status: 400 });
    }

    const status = await getVideoStatus(videoId);
    return NextResponse.json(status);
  } catch (err) {
    console.error("video-status:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur statut vidéo" },
      { status: 500 }
    );
  }
}
