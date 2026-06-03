import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { setCredits } from "@/lib/credits";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Webhook invalide" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId as PlanId | undefined;
    const plan = planId ? PLANS[planId] : null;
    const subscriptionId = (session.subscription as string) || null;

    if (plan && userId) {
      // Idempotence : si /api/stripe/confirm a déjà octroyé cet abonnement,
      // ne pas recréditer (évite de remettre les crédits à plein).
      const { data: existing } = await supabase
        .from("users")
        .select("stripe_subscription_id")
        .eq("id", userId)
        .single();

      const alreadyGranted =
        existing?.stripe_subscription_id &&
        subscriptionId &&
        existing.stripe_subscription_id === subscriptionId;

      if (!alreadyGranted) {
        await setCredits(userId, plan.credits, "subscription_new");
        await supabase
          .from("users")
          .update({
            plan: planId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            credits_reset_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("id", userId);
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    const { data: user } = await supabase
      .from("users")
      .select("id, plan")
      .eq("stripe_customer_id", customerId)
      .single();

    if (user?.plan) {
      const plan = PLANS[user.plan as PlanId];
      if (plan) {
        await setCredits(user.id, plan.credits, "subscription_renewal");
        await supabase
          .from("users")
          .update({
            credits_reset_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq("id", user.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
