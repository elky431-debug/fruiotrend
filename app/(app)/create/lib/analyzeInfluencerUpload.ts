"use client";

import { authFetch } from "@/lib/authFetch";
import type { InfluencerTraits, ProductImageAsset } from "@/types/ad";

/** Extrait les traits visuels d'une photo influenceur (validation côté serveur). */
export async function fetchInfluencerTraitsFromUpload(
  image: ProductImageAsset
): Promise<InfluencerTraits | null> {
  try {
    const res = await authFetch("/api/analyze-influencer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        influencerImage: { base64: image.base64, mimeType: image.mimeType },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { influencerTraits?: InfluencerTraits };
    return data.influencerTraits ?? null;
  } catch {
    return null;
  }
}
