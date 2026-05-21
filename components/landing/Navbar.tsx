import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-bg-card bg-bg-primary/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-xl">🍓</span>
          <span>FruitDrama</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
          <a href="#tarifs" className="transition hover:text-white">Tarifs</a>
          <a href="#faq" className="transition hover:text-white">FAQ</a>
          <a href="#" className="transition hover:text-white">Blog</a>
          <a href="#" className="transition hover:text-white">Contact</a>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-border-light px-3 py-1 text-xs text-text-secondary sm:inline">
            FR
          </span>
          <Link
            href="/login"
            className="rounded-full border border-white px-5 py-2 text-sm font-medium text-white transition hover:bg-bg-card"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </nav>
  );
}
