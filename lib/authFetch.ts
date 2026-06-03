"use client";

import { getSupabaseBrowser } from "@/lib/supabase";

/**
 * fetch authentifié : ajoute le token Supabase de l'utilisateur connecté dans
 * l'en-tête Authorization. Sans ce token, les routes API ne peuvent pas
 * identifier l'utilisateur → crédits/plan/sauvegarde de pubs tombent sur null.
 *
 * Si aucune session n'existe (utilisateur déconnecté / Supabase non configuré),
 * on retombe sur un fetch classique afin de ne rien casser en local.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  try {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // Pas de session disponible → requête anonyme (fallback dev).
  }

  return fetch(input, { ...init, headers });
}
