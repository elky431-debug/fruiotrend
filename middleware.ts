import { NextRequest, NextResponse } from "next/server";

/**
 * Paywall — point d'extension côté serveur.
 *
 * IMPORTANT : aujourd'hui l'app utilise `@supabase/supabase-js` qui stocke la
 * session dans le navigateur (localStorage), non lisible ici. Tant qu'une auth
 * par cookies (Supabase SSR / auth-helpers) n'est pas branchée, ce middleware
 * NE BLOQUE RIEN — l'enforcement réel est assuré côté client par
 * `PaywallGuard` (+ `requireApiUser` / `requireCredits` sur les routes API).
 *
 * Pour activer le blocage serveur une fois l'auth par cookies en place :
 *   - poser `PAYWALL_SSR_ENFORCE=true`
 *   - le middleware redirigera vers /login les requêtes sans cookie de session.
 */

const PUBLIC_PREFIXES = [
  "/", // landing
  "/plans",
  "/login",
  "/register",
  "/signup",
  "/api/stripe",
  "/api/webhooks",
  "/api/auth",
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

function hasSupabaseSessionCookie(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const enforce = process.env.PAYWALL_SSR_ENFORCE === "true";
  if (!enforce) return res;

  const path = req.nextUrl.pathname;
  if (isPublic(path)) return res;

  if (!hasSupabaseSessionCookie(req)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts|.*\\..*).*)"],
};
