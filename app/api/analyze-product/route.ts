import { NextRequest, NextResponse } from "next/server";
import { analyzeProductImages } from "@/lib/productAnalysis";

export const maxDuration = 60;

type ProductImageInput =
  | string
  | { base64?: string; mimeType?: string };

function normalizeImages(
  productImages: ProductImageInput[] | undefined
): { base64: string; mimeType: string }[] {
  if (!productImages?.length) return [];

  return productImages
    .slice(0, 3)
    .map((img) => {
      if (typeof img === "string") {
        return { base64: img, mimeType: "image/jpeg" };
      }
      if (img.base64) {
        return { base64: img.base64, mimeType: img.mimeType || "image/jpeg" };
      }
      return null;
    })
    .filter((x): x is { base64: string; mimeType: string } => x !== null);
}

export async function POST(req: NextRequest) {
  let fallbackDescription = "";

  try {
    const { productImages, productDescription } = (await req.json()) as {
      productImages?: ProductImageInput[];
      productDescription?: string;
    };

    fallbackDescription = productDescription?.trim() || "";
    const images = normalizeImages(productImages);
    const productAnalysis = await analyzeProductImages(
      images,
      fallbackDescription
    );

    console.log("[ANALYZE-PRODUCT] OK:", productAnalysis.substring(0, 120));
    return NextResponse.json({ productAnalysis });
  } catch (error) {
    console.error("[ANALYZE-PRODUCT]", error);
    return NextResponse.json({
      productAnalysis: fallbackDescription,
    });
  }
}
