import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/** Évite de répéter l'upsert pour un même utilisateur dans cette instance. */
const ensuredUsers = new Set<string>();

/**
 * Garantit qu'une ligne `users` existe pour cet utilisateur Supabase Auth.
 * Sans cette ligne, les crédits et l'activation d'abonnement (webhook Stripe
 * qui fait `update().eq("id", userId)`) n'ont aucune ligne à mettre à jour.
 * `ignoreDuplicates` évite d'écraser les crédits/plan déjà présents.
 */
async function ensureUserRow(id: string, email: string | null): Promise<void> {
  if (ensuredUsers.has(id)) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    // plan: null et credits: 0 explicites pour ne pas hériter d'un éventuel
    // DEFAULT 'free' hérité d'un ancien schéma (viole users_plan_check).
    await admin
      .from("users")
      .upsert(
        { id, email: email ?? `${id}@users.noemail`, plan: null, credits: 0 },
        { onConflict: "id", ignoreDuplicates: true }
      );
    ensuredUsers.add(id);
  } catch {
    // Non bloquant : la ligne existe probablement déjà.
  }
}

/** Résout l'utilisateur API (Bearer Supabase, ou CREDITS_DEV_USER_ID en dev). */
export async function getApiUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon && token) {
      const client = createClient(url, anon);
      const {
        data: { user },
      } = await client.auth.getUser(token);
      if (user?.id) {
        await ensureUserRow(user.id, user.email ?? null);
        return user.id;
      }
    }
  }

  const devUser = process.env.CREDITS_DEV_USER_ID?.trim();
  if (devUser) return devUser;

  // Mode dev : sans backend Supabase configuré (pas de service role key),
  // on retombe sur un utilisateur fictif pour ne pas verrouiller l'app en
  // local. En prod, SUPABASE_SERVICE_ROLE_KEY est défini → auth réelle exigée.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "dev-user";
  }

  return null;
}

export async function requireApiUser(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const userId = await getApiUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  return { userId };
}
