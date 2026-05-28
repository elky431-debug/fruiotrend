import { NextResponse } from "next/server";
import { parseFalApiError, VIDEO_QUEUE } from "@/lib/klingFal";

/** Diagnostic : la clé API fal répond-elle ou le compte est-il verrouillé ? */
export async function GET() {
  const key = process.env.FAL_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "FAL_API_KEY absente dans .env.local",
    });
  }

  try {
    const res = await fetch(VIDEO_QUEUE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${key}`,
      },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    const billing = parseFalApiError(text);

    if (billing?.kind === "account_locked") {
      return NextResponse.json({
        ok: false,
        locked: true,
        httpStatus: res.status,
        message: billing.message,
        hint: "Recharge visible sur fal.ai/dashboard mais API bloquée → contacte support@fal.ai",
        raw: text.slice(0, 300),
      });
    }

    if (billing?.kind === "no_credits") {
      return NextResponse.json({
        ok: false,
        locked: false,
        noCredits: true,
        message: billing.message,
        raw: text.slice(0, 300),
      });
    }

    if (res.status === 422 || res.status === 400) {
      return NextResponse.json({
        ok: true,
        message:
          "Clé API fal valide (compte non verrouillé). Erreur de validation attendue sur requête vide.",
      });
    }

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        message: "Clé API fal acceptée.",
      });
    }

    return NextResponse.json({
      ok: false,
      httpStatus: res.status,
      message: `Réponse fal inattendue (${res.status})`,
      raw: text.slice(0, 300),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    });
  }
}
