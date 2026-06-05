export function buildWojakVideoPrompt(
  narrativeRole: string,
  durationSeconds: number
): string {
  const mood =
    narrativeRole === "problem"
      ? "dark, cold, melancholic"
      : narrativeRole === "discovery"
        ? "neutral, curious, transitional"
        : "warm, hopeful, confident";

  return `
Cinematic video of this scene.

STRICT RULES:
- STATIC characters — NO lip movement, NO mouth animation, NO speaking gestures
- The character stands completely still, only very subtle breathing movement
- NO lip sync, NO mouth opening, the character does NOT speak
- Only the camera moves, not the character

CAMERA MOVEMENT:
- Very slow, subtle zoom in — starting wide, very slowly moving closer
- Ken Burns effect — gentle, cinematic, smooth
- Start at 100% zoom, end at 108% zoom over the full duration
- NO shaky camera, NO fast movement

DURATION: ${durationSeconds} seconds
MOOD: ${mood}

FORBIDDEN:
- NO mouth movement
- NO speaking animation
- NO lip sync
- NO fast zoom
- NO camera shake
`.trim();
}
