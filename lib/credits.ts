import { getSupabaseAdmin } from "@/lib/supabase";
import { CREDIT_COSTS, type CreditAction } from "@/lib/plans";

export type CreditCheckResult = {
  success: boolean;
  remaining: number;
  cost: number;
  error?: string;
};

const VALID_PLANS = ["starter", "pro", "business"] as const;

export type UserPlanInfo = {
  plan: string | null;
  hasPlan: boolean;
};

/**
 * Utilisateur de dev synthétique (pas une vraie ligne Supabase) : on ne
 * requête pas la base et on renvoie des valeurs dev. Activé en local via
 * CREDITS_DEV_USER_ID=dev-user, jamais en prod (variable absente).
 */
function isSyntheticDevUser(userId: string): boolean {
  return userId === "dev-user";
}

/**
 * Récupère le plan de l'utilisateur. En l'absence de Supabase (mode dev),
 * retombe sur CREDITS_DEV_PLAN (par défaut "pro") afin de ne pas verrouiller
 * l'app en local tant qu'aucune authentification réelle n'est branchée.
 */
export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
  const supabase = getSupabaseAdmin();
  if (!supabase || isSyntheticDevUser(userId)) {
    const devPlan = process.env.CREDITS_DEV_PLAN ?? "pro";
    return {
      plan: devPlan,
      hasPlan: (VALID_PLANS as readonly string[]).includes(devPlan),
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  if (error || !data) return { plan: null, hasPlan: false };

  const plan = (data.plan as string | null) ?? null;
  return {
    plan,
    hasPlan: !!plan && (VALID_PLANS as readonly string[]).includes(plan),
  };
}

export async function getCredits(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase || isSyntheticDevUser(userId)) {
    return Number(process.env.CREDITS_DEV_BALANCE ?? 999);
  }

  const { data, error } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error || !data) return 0;
  return data.credits ?? 0;
}

export async function checkAndDeduct(
  userId: string,
  action: CreditAction
): Promise<CreditCheckResult> {
  const cost = CREDIT_COSTS[action];
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const remaining = Number(process.env.CREDITS_DEV_BALANCE ?? 999) - cost;
    return { success: true, remaining: Math.max(0, remaining), cost };
  }

  const current = await getCredits(userId);
  if (current < cost) {
    return { success: false, remaining: current, cost };
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ credits: current - cost })
    .eq("id", userId)
    .gte("credits", cost)
    .select("credits")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      remaining: current,
      cost,
      error: "Échec de la déduction",
    };
  }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -cost,
    reason: action,
  });

  return {
    success: true,
    remaining: updated.credits ?? current - cost,
    cost,
  };
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const current = await getCredits(userId);
  const next = current + amount;

  await supabase.from("users").update({ credits: next }).eq("id", userId);

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    reason,
  });
}

export async function setCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("users").update({ credits: amount }).eq("id", userId);

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    reason,
  });
}
