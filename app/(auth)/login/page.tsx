"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PubMoiLogo } from "@/components/brand/PubMoiLogo";
import { getSupabaseBrowser } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white placeholder:text-text-muted focus:border-accent focus:outline-none";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Entre ton email et ton mot de passe.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError(
        "Authentification non configurée (Supabase manquant). Contacte le support."
      );
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(
          signInError.message.includes("Invalid login credentials")
            ? "Email ou mot de passe incorrect."
            : signInError.message.includes("Email not confirmed")
              ? "Confirme d'abord ton email (vérifie ta boîte mail)."
              : signInError.message
        );
        return;
      }

      router.replace(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Authentification non configurée (Supabase manquant).");
      return;
    }
    setGoogleLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${redirect}`
              : undefined,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <div className="mb-8">
        <PubMoiLogo href="/" size="lg" />
      </div>
      <div className="w-full max-w-md card-base p-8">
        <h1 className="text-2xl font-bold text-white">Se connecter</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Connecte-toi pour retrouver et créer tes pubs.
        </p>

        <div className="mt-8 space-y-3">
          <Button
            variant="secondary"
            fullWidth
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? "Redirection…" : "Continuer avec Google"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Pas de compte ?{" "}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="text-accent hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
