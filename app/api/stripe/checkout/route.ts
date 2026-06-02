import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireApiUser } from "@/lib/auth-api";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSupabaseAdmin } from "@/lib/supabase";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 503 }
    );
  }

  const auth = await requireApiUser(req);
  if (auth instanceof Response) {
    return auth;
  }

  const { planId } = (await req.json()) as { planId?: string };
  const plan = planId ? PLANS[planId as PlanId] : null;
  if (!plan?.priceId) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let customerEmail: string | undefined;
  if (supabase) {
    const { data } = await supabase
      .from("users")
      .select("email")
      .eq("id", auth.userId)
      .single();
    customerEmail = data?.email ?? undefined;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?success=true&plan=${planId}`,
    cancel_url: `${baseUrl}/plans`,
    metadata: {
      userId: auth.userId,
      planId: plan.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
