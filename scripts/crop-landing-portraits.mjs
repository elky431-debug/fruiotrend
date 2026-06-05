/**
 * Recadre les aperçus landing en 9:16 (centre) pour le hero — meilleure qualité, sans bandes.
 * Usage: node scripts/crop-landing-portraits.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "landing");

const PAIRS = [
  ["pubmoi-produit-vivant.png", "pubmoi-produit-vivant-9x16.webp"],
  ["pubmoi-influenceur.png", "pubmoi-influenceur-9x16.webp"],
  ["pubmoi-fruit-drama.png", "pubmoi-fruit-drama-9x16.webp"],
  ["pubmoi-wojak-npc.png", "pubmoi-wojak-npc-9x16.webp"],
];

async function cropToPortrait(inputName, outputName) {
  const input = path.join(root, inputName);
  const output = path.join(root, outputName);
  const meta = await sharp(input).metadata();
  const height = meta.height ?? 1024;
  const width = Math.min(meta.width ?? 1536, Math.round((height * 9) / 16));
  const left = Math.max(0, Math.round(((meta.width ?? 1536) - width) / 2));

  await sharp(input)
    .extract({ left, top: 0, width, height })
    .webp({ quality: 92, effort: 6 })
    .toFile(output);

  console.log(`OK ${outputName} (${width}x${height})`);
}

for (const [inName, outName] of PAIRS) {
  await cropToPortrait(inName, outName);
}
