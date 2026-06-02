import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-api";
import { checkAndDeduct, getCredits, type CreditCheckResult } from "@/lib/credits";
import { CREDIT_COSTS, type CreditAction } from "@/lib/plans";

export function insufficientCreditsResponse(result: CreditCheckResult) {
  return NextResponse.json(
    {
      error: "Crédits insuffisants. Rechargez votre plan.",
      required: result.cost,
      remaining: result.remaining,
      code: "INSUFFICIENT_CREDITS",
    },
    { status: 402 }
  );
}

export type CreditGuardOptions = {
  /** Utiliser regenerate_image / regenerate_video au lieu de image / video. */
  regenerate?: boolean;
};

export function resolveCreditAction(
  base: Extract<CreditAction, "image" | "video">,
  options?: CreditGuardOptions
): CreditAction {
  if (options?.regenerate) {
    return base === "image" ? "regenerate_image" : "regenerate_video";
  }
  return base;
}

/** Authentifie l'utilisateur et déduit les crédits avant la logique métier. */
export async function requireCredits(
  req: NextRequest,
  action: CreditAction,
  options?: CreditGuardOptions
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiUser(req);
  if (auth instanceof NextResponse) return auth;

  const resolved =
    action === "image" || action === "video"
      ? resolveCreditAction(action, options)
      : action;

  const result = await checkAndDeduct(auth.userId, resolved);
  if (!result.success) {
    return insufficientCreditsResponse(result);
  }

  return { userId: auth.userId };
}

/** Déduit plusieurs actions dans l'ordre (ex. vidéo + voix + lip sync par scène). */
export async function requireCreditsMulti(
  req: NextRequest,
  actions: CreditAction[],
  options?: CreditGuardOptions
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiUser(req);
  if (auth instanceof NextResponse) return auth;

  const resolved = actions.map((action) => {
    if (action === "image" || action === "video") {
      return resolveCreditAction(action, options);
    }
    return action;
  });

  const totalCost = resolved.reduce((sum, a) => sum + CREDIT_COSTS[a], 0);
  const balance = await getCredits(auth.userId);
  if (balance < totalCost) {
    return insufficientCreditsResponse({
      success: false,
      remaining: balance,
      cost: totalCost,
    });
  }

  for (const action of resolved) {
    const result = await checkAndDeduct(auth.userId, action);
    if (!result.success) {
      return insufficientCreditsResponse(result);
    }
  }

  return { userId: auth.userId };
}

export { CREDIT_COSTS };
