import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PubMoiLogo } from "@/components/brand/PubMoiLogo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <div className="mb-8">
        <PubMoiLogo href="/" size="lg" />
      </div>
      <div className="w-full max-w-md card-base p-8">
        <h1 className="text-2xl font-bold text-white">Se connecter</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Connecte-toi pour sauvegarder tes vidéos
        </p>
        <div className="mt-8 space-y-3">
          <Button variant="secondary" fullWidth>
            Continuer avec Google
          </Button>
          <input
            type="email"
            placeholder="votre@email.com"
            className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button fullWidth>Continuer avec Email</Button>
        </div>
        <p className="mt-6 text-center text-sm text-text-muted">
          Pas de compte ?{" "}
          <Link href="/register" className="text-accent hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
