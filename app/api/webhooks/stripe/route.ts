import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  pro: 9999,
};

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan ?? "starter";
    const credits = PLAN_CREDITS[plan] ?? 100;

    if (userId) {
      await supabase
        .from("users")
        .update({ plan, credits })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
