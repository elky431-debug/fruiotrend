"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PubMoiLogo } from "@/components/brand/PubMoiLogo";
import { getSupabaseBrowser } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white placeholder:text-text-muted focus:border-accent focus:outline-none";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/plans";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return "Entre ton adresse email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Adresse email invalide.";
    if (password.length < 8)
      return "Le mot de passe doit faire au moins 8 caractères.";
    if (password !== confirm)
      return "Les deux mots de passe ne correspondent pas.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });

      if (signUpError) {
        setError(
          signUpError.message.includes("already registered") ||
            signUpError.message.includes("already been registered")
            ? "Un compte existe déjà avec cet email. Connecte-toi."
            : signUpError.message
        );
        return;
      }

      // Email de confirmation requis → pas de session immédiate.
      if (!data.session) {
        setInfo(
          "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi."
        );
        return;
      }

      router.replace(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création du compte."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <div className="mb-8">
        <PubMoiLogo href="/" size="lg" />
      </div>
      <div className="w-full max-w-md card-base p-8">
        <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Crée ton compte pour commencer à générer tes pubs.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
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
            autoComplete="new-password"
            placeholder="Mot de passe (8 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirme le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {info && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {info}
            </p>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
