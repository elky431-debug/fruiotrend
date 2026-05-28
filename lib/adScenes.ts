import type { AdScene, AdScript, ProductInput } from "@/types/ad";

/** Nombre de scènes choisi par l'utilisateur (source de vérité). */
export function resolveSceneCount(
  product: Pick<ProductInput, "nScenes">,
  script?: Pick<AdScript, "nScenes" | "scenes"> | null
): number {
  const raw =
    script?.nScenes ??
    product.nScenes ??
    script?.scenes?.length ??
    1;
  return Math.min(Math.max(Number(raw) || 1, 1), 3);
}

/** Scènes actives, renumérotées 1…N — jamais plus que le choix utilisateur. */
export function getActiveScenes(
  product: Pick<ProductInput, "nScenes">,
  script: AdScript
): AdScene[] {
  const count = resolveSceneCount(product, script);
  return script.scenes.slice(0, count).map((scene, i) => ({
    ...scene,
    number: i + 1,
  }));
}

export function normalizeAdScript(
  script: AdScript,
  nScenes: number
): AdScript {
  const count = Math.min(Math.max(Number(nScenes) || 1, 1), 3);
  const scenes = (script.scenes || [])
    .slice(0, count)
    .map((scene, i) => ({ ...scene, number: i + 1 }));
  return { ...script, nScenes: count, scenes };
}
