/** fal.ai — LTX 2.3 Fast (le plus rapide sur fal, ~30–90s) */
export const VIDEO_MODEL = "fal-ai/ltx-2.3/image-to-video/fast";
export const VIDEO_QUEUE = `https://queue.fal.run/${VIDEO_MODEL}`;
export const VIDEO_RUN = `https://fal.run/${VIDEO_MODEL}`;
/** fal raccourcit le chemin pour status/result : …/fal-ai/ltx-2.3/requests/{id} */
export const VIDEO_QUEUE_REQUESTS = "https://queue.fal.run/fal-ai/ltx-2.3";

/** @deprecated aliases */
export const KLING_MODEL = VIDEO_MODEL;
export const KLING_QUEUE = VIDEO_QUEUE;

export type FalBillingErrorKind = "account_locked" | "no_credits";

export function parseFalApiError(
  text: string
): { kind: FalBillingErrorKind; message: string } | null {
  const lower = text.toLowerCase();

  if (lower.includes("user is locked")) {
    return {
      kind: "account_locked",
      message:
        "Service vidéo PubMoi temporairement indisponible. Réessaie plus tard ou contacte le support.",
    };
  }

  if (
    lower.includes("exhausted balance") ||
    lower.includes("insufficient") ||
    lower.includes("top up your balance")
  ) {
    return {
      kind: "no_credits",
      message:
        "Capacité de génération vidéo temporairement saturée. Réessaie dans quelques minutes.",
    };
  }

  return null;
}

export function parseFalBillingError(text: string): string | null {
  return parseFalApiError(text)?.message ?? null;
}

const LTX_DURATIONS = [6, 8, 10, 12, 14, 16, 18, 20] as const;

export function mapVideoDurationSeconds(seconds?: number): number {
  const target = Math.min(20, Math.max(6, Math.round(seconds || 6)));
  return LTX_DURATIONS.reduce((best, d) =>
    Math.abs(d - target) < Math.abs(best - target) ? d : best
  );
}

export const VIDEO_CAMERA_AUDIO_RULES = `

CAMERA MOVEMENT:
- STATIC camera — absolutely NO zoom in, NO zoom out
- NO slow push in, NO dolly movement, NO camera drift
- The camera stays completely fixed throughout the entire video
- Only the character moves, not the camera

AUDIO:
- NO background music
- NO soundtrack
- NO ambient music
- Silence only — the voiceover will be added separately`;

const STRICT_HUMAN_ANATOMY_RULES = `
STRICT ANATOMY RULES:
- The character has EXACTLY TWO arms and TWO hands — no more, no less
- Both hands hold the product steadily throughout the entire video
- NO extra limbs, NO ghost arms, NO duplicate body parts
- Character body stays anatomically correct in every single frame
- Smooth natural movement only — no morphing or body distortion
- Keep the character appearance 100% consistent from start to finish`;

export const ANTI_GHOST_PROMPT = `
STRICT ANATOMY RULES — ENFORCED ON EVERY FRAME:
- The character has EXACTLY TWO hands — no more, no less
- When a hand or arm moves, the previous position must NOT leave a ghost/trace/residual hand
- NO ghost limbs, NO duplicate hands, NO phantom arms
- NO fading residual body parts from previous frames
- If the character holds an object and moves it, the object moves cleanly with the hand
- The hand holding the phone stays attached to the phone at ALL TIMES
- NO third hand appearing anywhere in the frame
- Check every frame: exactly 2 hands visible maximum`.trim();

export function appendAntiGhostPrompt(prompt: string): string {
  return `${prompt.trim()}\n\n${ANTI_GHOST_PROMPT}`;
}

export function enrichVideoPrompt(
  basePrompt: string,
  opts?: {
    mouthExpression?: string;
    voiceover?: string;
    voiceStyle?: string;
    language?: string;
    /** Influenceur / personnage humain — évite 3 bras, membres fantômes */
    humanPresenter?: boolean;
  }
): string {
  const mouth = opts?.mouthExpression || "open mouth speaking";
  const lang = opts?.language || "French";
  const voiceStyle = opts?.voiceStyle || "warm natural";
  const core = String(basePrompt).slice(0, opts?.humanPresenter ? 200 : 260);
  const dialogue = opts?.voiceover?.trim();
  const speechBlock = dialogue
    ? ` The character speaks clearly in ${lang} (${voiceStyle} voice), dialogue: "${dialogue.slice(0, 180)}". Lip-synced mouth (${mouth}).`
    : ` Character speaks in ${lang} with ${voiceStyle} voice, mouth (${mouth}) animated as if talking.`;
  const anatomy = opts?.humanPresenter ? STRICT_HUMAN_ANATOMY_RULES : "";
  const body = `${core}.${speechBlock} Cinematic Pixar 3D ad, 9:16 vertical, lip-sync mouth only.${anatomy}${VIDEO_CAMERA_AUDIO_RULES}`;
  return appendAntiGhostPrompt(body);
}

export function buildVideoInput(
  imageUrl: string,
  prompt: string,
  durationSeconds?: number,
  mouthExpression?: string,
  audioOpts?: {
    voiceover?: string;
    voiceStyle?: string;
    language?: string;
    humanPresenter?: boolean;
  }
) {
  return {
    image_url: imageUrl,
    prompt: enrichVideoPrompt(prompt, {
      mouthExpression,
      voiceover: audioOpts?.voiceover,
      voiceStyle: audioOpts?.voiceStyle,
      language: audioOpts?.language,
      humanPresenter: audioOpts?.humanPresenter,
    }),
    duration: mapVideoDurationSeconds(durationSeconds),
    aspect_ratio: "9:16",
    resolution: "1080p",
    fps: 24,
    generate_audio: false,
  };
}

export async function uploadImageToFal(
  apiKey: string,
  base64: string,
  contentType = "image/jpeg"
): Promise<string | null> {
  const body = JSON.stringify({
    file_name: `pubmoi-${Date.now()}.jpg`,
    content_type: contentType,
    data: base64,
  });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Key ${apiKey}`,
  };

  const endpoints = [
    "https://fal.run/fal-ai/storage/upload/base64",
    "https://rest.alpha.fal.ai/storage/upload/base64",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (!res.ok) continue;
      const json = (await res.json()) as { url?: string; file_url?: string };
      return json.url || json.file_url || null;
    } catch {
      /* next */
    }
  }
  return null;
}

export async function resolveFalImageUrl(
  apiKey: string,
  imageUrl?: string,
  imageBase64?: string
): Promise<string> {
  if (imageUrl && !imageUrl.startsWith("data:")) return imageUrl;

  const raw = imageBase64 || (imageUrl?.includes(",") ? imageUrl.split(",")[1] : "");
  if (!raw) throw new Error("Image manquante");

  const hosted = await uploadImageToFal(apiKey, raw);
  if (hosted) return hosted;

  return `data:image/jpeg;base64,${raw}`;
}

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function looksLikeVideoUrl(v: string): boolean {
  return (
    v.includes(".mp4") ||
    v.includes("fal.media") ||
    v.includes("fal.run") ||
    v.includes("/video")
  );
}

function urlFromVideoField(v: unknown): string | null {
  if (isHttpUrl(v) && looksLikeVideoUrl(v)) return v;
  if (isHttpUrl(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (isHttpUrl(o.url)) return o.url;
    if (isHttpUrl(o.file_url)) return o.file_url;
  }
  return null;
}

export function extractVideoUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  for (const block of [root.response, root.payload, root.output, root.data, root]) {
    if (!block || typeof block !== "object") continue;
    const direct = urlFromVideoField(
      (block as Record<string, unknown>).video
    );
    if (direct) return direct;
  }

  const seen = new Set<object>();
  function walk(node: unknown): string | null {
    if (node == null) return null;
    const fromField = urlFromVideoField(node);
    if (fromField) return fromField;
    if (typeof node === "string" && isHttpUrl(node) && looksLikeVideoUrl(node)) {
      return node;
    }
    if (typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    const obj = node as Record<string, unknown>;
    if (obj.video) {
      const v = urlFromVideoField(obj.video);
      if (v) return v;
    }
    for (const value of Object.values(obj)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  }
  return walk(payload);
}

export const extractKlingVideoUrl = extractVideoUrl;

export async function fetchFalResultOnce(
  requestId: string,
  auth: Record<string, string>,
  statusData?: Record<string, unknown>
): Promise<{ payload: unknown; videoUrl: string | null }> {
  const responseUrl = statusData?.response_url;
  const url =
    typeof responseUrl === "string"
      ? responseUrl
      : `${VIDEO_QUEUE_REQUESTS}/requests/${requestId}`;

  try {
    const res = await fetch(url, { headers: auth });
    if (!res.ok) return { payload: null, videoUrl: null };
    const payload = await res.json();
    return { payload, videoUrl: extractVideoUrl(payload) };
  } catch {
    return { payload: null, videoUrl: null };
  }
}

export function falQueueStatusUrl(requestId: string): string {
  return `${VIDEO_QUEUE_REQUESTS}/requests/${requestId}/status`;
}
