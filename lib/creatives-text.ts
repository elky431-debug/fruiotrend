import sharp from "sharp";

export type TextOverlayPosition = "top" | "bottom" | "left";
export type TextOverlayTheme = "light" | "dark";

export interface TextOverlayOptions {
  imageBuffer: Buffer;
  headline: string;
  subtext?: string;
  position?: TextOverlayPosition;
  theme?: TextOverlayTheme;
}

function stripAccentsForSvg(text: string, uppercase = false): string {
  let out = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "");
  if (uppercase) out = out.toUpperCase();
  return out;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function addTextOverlay({
  imageBuffer,
  headline,
  subtext,
  position = "left",
  theme = "dark",
}: TextOverlayOptions): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 1080;
  const h = meta.height || 1080;

  const cleanHeadline = escapeXml(stripAccentsForSvg(headline, true));
  const cleanSubtext = escapeXml(
    stripAccentsForSvg(subtext || "Decouvrir maintenant")
  );

  const textColor = theme === "dark" ? "#FFFFFF" : "#1a1a1a";

  let svgText = "";

  if (position === "left") {
    svgText = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.75)" />
      <stop offset="55%" style="stop-color:rgba(0,0,0,0.4)" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  <rect width="${w * 0.6}" height="${h}" fill="url(#grad)" />
  <text
    x="${w * 0.08}"
    y="${h * 0.42}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${Math.floor(w * 0.065)}"
    font-weight="900"
    fill="${textColor}"
    dominant-baseline="middle"
  >${cleanHeadline.substring(0, 20)}</text>
  ${
    cleanHeadline.length > 20
      ? `<text
    x="${w * 0.08}"
    y="${h * 0.52}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${Math.floor(w * 0.065)}"
    font-weight="900"
    fill="${textColor}"
    dominant-baseline="middle"
  >${cleanHeadline.substring(20, 40)}</text>`
      : ""
  }
  <text
    x="${w * 0.08}"
    y="${h * 0.65}"
    font-family="Arial, sans-serif"
    font-size="${Math.floor(w * 0.032)}"
    fill="${textColor}"
    opacity="0.85"
  >${cleanSubtext}</text>
</svg>`;
  } else if (position === "top") {
    svgText = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.8)" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h * 0.45}" fill="url(#grad2)" />
  <text
    x="${w / 2}"
    y="${h * 0.2}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${Math.floor(w * 0.072)}"
    font-weight="900"
    fill="${textColor}"
    text-anchor="middle"
    dominant-baseline="middle"
  >${cleanHeadline.substring(0, 18)}</text>
  ${
    cleanHeadline.length > 18
      ? `<text
    x="${w / 2}"
    y="${h * 0.3}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${Math.floor(w * 0.072)}"
    font-weight="900"
    fill="${textColor}"
    text-anchor="middle"
    dominant-baseline="middle"
  >${cleanHeadline.substring(18, 36)}</text>`
      : ""
  }
  <text
    x="${w / 2}"
    y="${h * 0.42}"
    font-family="Arial, sans-serif"
    font-size="${Math.floor(w * 0.03)}"
    fill="${textColor}"
    text-anchor="middle"
    opacity="0.85"
  >${cleanSubtext}</text>
</svg>`;
  }

  const svgBuffer = Buffer.from(svgText);

  return sharp(imageBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();
}
