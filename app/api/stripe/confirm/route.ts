import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireApiUser } from "@/lib/auth-api";
import { setCredits } from "@/lib/credits";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Confirme l'abonnement après le retour de Stripe Checkout (success_url).
 * Sert de filet de sécurité au webhook : fonctionne même si le webhook n'est
 * pas configuré (cas fréquent en local) et corrige la course entre la
 * redirection et le traitement asynchrone du webhook.
 *
 * Idempotent : on n'octroie les crédits qu'une fois par abonnement Stripe
 * (comparaison avec users.stripe_subscription_id).
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const auth = await requireApiUser(req);
  if (auth instanceof NextResponse) return auth;

  const { sessionId } = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
  };
  if (!sessionId) {
    return NextResponse.json({ error: "session_id manquant" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const paid =
    session.payment_status === "paid" || session.status === "complete";
  if (!paid) {
    return NextResponse.json({ granted: false, pending: true });
  }

  // Sécurité : la session doit appartenir à l'utilisateur connecté.
  const metaUserId = session.metadata?.userId;
  if (metaUserId && metaUserId !== auth.userId) {
    return NextResponse.json({ error: "Session non autorisée" }, { status: 403 });
  }

  const planId = session.metadata?.planId as PlanId | undefined;
  const plan = planId ? PLANS[planId] : null;
  if (!plan) {
    return NextResponse.json({ error: "Plan inconnu" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Pas de backend → rien à persister (mode dev).
    return NextResponse.json({ granted: true, plan: planId });
  }

  const subscriptionId = (session.subscription as string) || null;

  const { data: existing } = await supabase
    .from("users")
    .select("stripe_subscription_id, plan")
    .eq("id", auth.userId)
    .single();

  // Déjà octroyé pour cet abonnement → ne pas recréditer (idempotence).
  if (
    existing?.stripe_subscription_id &&
    subscriptionId &&
    existing.stripe_subscription_id === subscriptionId
  ) {
    return NextResponse.json({
      granted: true,
      already: true,
      plan: existing.plan,
    });
  }

  await setCredits(auth.userId, plan.credits, "subscription_new");
  await supabase
    .from("users")
    .update({
      plan: planId,
      stripe_customer_id: (session.customer as string) || null,
      stripe_subscription_id: subscriptionId,
      credits_reset_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("id", auth.userId);

  return NextResponse.json({ granted: true, plan: planId });
}
