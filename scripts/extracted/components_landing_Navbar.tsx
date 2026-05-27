import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-warm text-lg shadow-accent">
            🍓
          </span>
          <span className="tracking-tight">FruitDrama</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
          <a href="#tarifs" className="transition hover:text-accent">
            Tarifs
          </a>
          <a href="#faq" className="transition hover:text-accent">
            FAQ
          </a>
          <a href="#" className="transition hover:text-white">
            Blog
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-border-light px-5 py-2 text-sm font-medium text-white transition hover:border-accent hover:text-accent"
          >
            Se connecter
          </Link>
          <Link href="/generate" className="btn-primary hidden px-5 py-2 text-sm sm:inline-flex">
            Créer →
          </Link>
        </div>
      </div>
    </nav>
  );
}
