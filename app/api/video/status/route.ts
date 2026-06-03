import { NextRequest, NextResponse } from "next/server";
import {
  extractVideoUrl,
  falQueueStatusUrl,
  fetchFalResultOnce,
  parseFalBillingError,
} from "@/lib/klingFal";

export const maxDuration = 30;

function normalizeStatus(raw?: string): string {
  return (raw || "IN_PROGRESS").toUpperCase().replace(/\s/g, "_");
}

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get("requestId");
    const customStatusUrl = req.nextUrl.searchParams.get("statusUrl");

    if (!requestId) {
      return NextResponse.json({ error: "requestId manquant" }, { status: 400 });
    }

    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "Service vidéo PubMoi indisponible. Réessaie plus tard." },
        { status: 500 }
      );
    }

    const auth = { Authorization: `Key ${process.env.FAL_API_KEY}` };

    const { videoUrl: readyUrl } = await fetchFalResultOnce(requestId, auth);
    if (readyUrl) {
      return NextResponse.json({ status: "COMPLETED", videoUrl: readyUrl });
    }

    const statusEndpoint =
      customStatusUrl?.startsWith("https://queue.fal.run/")
        ? customStatusUrl
        : falQueueStatusUrl(requestId);

    const statusRes = await fetch(statusEndpoint, { headers: auth });

    if (!statusRes.ok) {
      const text = await statusRes.text();
      const billingErr = parseFalBillingError(text);
      if (billingErr) {
        return NextResponse.json({ status: "FAILED", error: billingErr });
      }
      return NextResponse.json({ status: "IN_PROGRESS" });
    }

    const data = (await statusRes.json()) as Record<string, unknown>;
    const st = normalizeStatus(data.status as string | undefined);

    if (st === "FAILED" || st === "ERROR" || st === "CANCELLED") {
      const billingErr = parseFalBillingError(String(data.error || ""));
      return NextResponse.json({
        status: "FAILED",
        error: billingErr || String(data.error || "Génération échouée"),
      });
    }

    if (st === "COMPLETED" || st === "DONE" || st === "SUCCESS") {
      let videoUrl = extractVideoUrl(data);
      if (!videoUrl) {
        const fetched = await fetchFalResultOnce(requestId, auth, data);
        videoUrl = fetched.videoUrl;
        if (!videoUrl && fetched.payload) {
          console.log(
            "[VIDEO/STATUS] Full response:",
            JSON.stringify(fetched.payload).substring(0, 500)
          );
        }
      }

      if (videoUrl) {
        console.log("[VIDEO/STATUS] ✅", videoUrl.slice(0, 60));
        return NextResponse.json({ status: "COMPLETED", videoUrl });
      }

      return NextResponse.json({
        status: "COMPLETED_NO_URL",
        debug: JSON.stringify(data).substring(0, 300),
      });
    }

    const queueLabel =
      st === "IN_QUEUE"
        ? "IN_QUEUE"
        : typeof data.queue_position === "number"
          ? "IN_QUEUE"
          : "IN_PROGRESS";

    return NextResponse.json({
      status: queueLabel,
      queuePosition:
        typeof data.queue_position === "number"
          ? data.queue_position
          : undefined,
    });
  } catch (error) {
    console.error("[VIDEO/STATUS]", error);
    return NextResponse.json({ status: "IN_PROGRESS" });
  }
}
