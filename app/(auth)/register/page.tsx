import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-white">
        <span className="text-2xl">🍓</span> FruitDrama
      </Link>
      <div className="w-full max-w-md card-base p-8">
        <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
        <p className="mt-2 text-sm text-text-secondary">3 crédits gratuits à l&apos;inscription</p>
        <div className="mt-8 space-y-3">
          <input
            type="email"
            placeholder="votre@email.com"
            className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-white placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button fullWidth>Créer mon compte</Button>
        </div>
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
