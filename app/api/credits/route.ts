import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-api";
import { getCredits, getUserPlan } from "@/lib/credits";

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (auth instanceof Response) {
    return auth;
  }

  const [credits, planInfo] = await Promise.all([
    getCredits(auth.userId),
    getUserPlan(auth.userId),
  ]);

  return NextResponse.json({
    credits,
    plan: planInfo.plan,
    hasPlan: planInfo.hasPlan,
    userId: auth.userId,
  });
}
