import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient(url, key);
  }
  return adminClient;
}

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function deductCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: true, remaining: 999 };
  }

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    return { success: false, error: "User not found" };
  }

  if (user.credits < amount) {
    return { success: false, error: "Insufficient credits", remaining: user.credits };
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ credits: user.credits - amount })
    .eq("id", userId)
    .gte("credits", amount)
    .select("credits")
    .single();

  if (updateError || !updated) {
    return { success: false, error: "Failed to deduct credits" };
  }

  return { success: true, remaining: updated.credits };
}

export async function refundCredits(
  userId: string,
  amount: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (user) {
    await supabase
      .from("users")
      .update({ credits: user.credits + amount })
      .eq("id", userId);
  }
}
