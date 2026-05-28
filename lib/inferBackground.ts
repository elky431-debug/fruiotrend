/** Décor contextuel par défaut si GPT n'a pas fourni scene.background */
export function inferBackground(productDescription: string): string {
  const desc = productDescription.toLowerCase();

  if (
    desc.includes("massage") ||
    desc.includes("muscle") ||
    desc.includes("sport") ||
    desc.includes("fitness") ||
    desc.includes("gym")
  ) {
    return "Professional gym interior, rubber floor with gym markings, blue LED strip lights along walls, weights and equipment in soft bokeh background, dramatic side lighting creating depth";
  }
  if (
    desc.includes("crème") ||
    desc.includes("soin") ||
    desc.includes("peau") ||
    desc.includes("visage") ||
    desc.includes("beauté") ||
    desc.includes("beauty")
  ) {
    return "Elegant bathroom with marble surfaces, warm vanity mirror with soft glowing lights, pink roses in a vase, white candles, luxury spa atmosphere";
  }
  if (
    desc.includes("tech") ||
    desc.includes("gadget") ||
    desc.includes("électronique") ||
    desc.includes("gaming") ||
    desc.includes("electronic")
  ) {
    return "Modern dark desk setup with RGB lighting, multiple screens in background, clean minimal workspace, purple and blue accent lights";
  }
  if (
    desc.includes("cuisine") ||
    desc.includes("food") ||
    desc.includes("cook") ||
    desc.includes("kitchen") ||
    desc.includes("aliment")
  ) {
    return "Modern open kitchen with marble countertop, fresh herbs, warm golden lighting, clean and inviting atmosphere";
  }
  if (
    desc.includes("mode") ||
    desc.includes("vêtement") ||
    desc.includes("sac") ||
    desc.includes("bijou") ||
    desc.includes("fashion")
  ) {
    return "Luxury boutique interior, soft spotlight, clean white marble floor, elegant minimalist decor, warm golden accents";
  }
  if (desc.includes("enfant") || desc.includes("jouet") || desc.includes("toy")) {
    return "Colorful children's bedroom with soft warm light, plush cushions, playful toys scattered in soft bokeh, cozy and joyful atmosphere";
  }

  return "Warm lifestyle interior, soft natural lighting from large window, clean modern decor with plants, cozy and aspirational atmosphere";
}
