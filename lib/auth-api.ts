import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
      if (user?.id) return user.id;
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
