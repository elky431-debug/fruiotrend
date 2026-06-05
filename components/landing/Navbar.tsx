"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PubMoiLogo } from "@/components/brand/PubMoiLogo";
import { getSupabaseBrowser } from "@/lib/supabase";

export function Navbar() {
  // `null` = encore inconnu (évite le flash "Se connecter" pour un user déjà loggé)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setSignedIn(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });

    // Reflète immédiatement les changements (login/logout/refresh de token)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
          {signedIn ? (
            <>
              <Link href="/dashboard" className="landing-nav-login">
                <span className="landing-nav-login-long">Mes pubs</span>
                <span className="landing-nav-login-short">Mes pubs</span>
              </Link>
              <Link href="/dashboard" className="btn-primary landing-nav-cta">
                Créer →
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="landing-nav-login">
                <span className="landing-nav-login-long">Se connecter</span>
                <span className="landing-nav-login-short">Connexion</span>
              </Link>
              <Link href="/dashboard" className="btn-primary landing-nav-cta">
                Créer →
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
