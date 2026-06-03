import Link from "next/link";

import { PubMoiLogo } from "@/components/brand/PubMoiLogo";

export function Navbar() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-nav-logo">
          <PubMoiLogo href="/" size="sm" priority />
        </div>

        <div className="landing-nav-links">
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-login">
            <span className="landing-nav-login-long">Se connecter</span>
            <span className="landing-nav-login-short">Connexion</span>
          </Link>
          <Link href="/create" className="btn-primary landing-nav-cta">
            Créer →
          </Link>
        </div>
      </div>
    </nav>
  );
}
