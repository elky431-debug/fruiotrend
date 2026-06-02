import Link from "next/link";

export function FinalCTASection() {
  return (
    <section className="landing-cta-section">
      <div className="landing-cta-band">
        <span className="badge badge-accent">🚀 Prêt à lancer</span>
        <h2 className="landing-cta-title">
          Ta prochaine pub qui cartonne
          <br />
          est à <span className="text-gradient">5 minutes</span> d&apos;ici
        </h2>
        <p className="landing-cta-sub">
          Upload ton produit, laisse l&apos;IA écrire, dessiner et animer. Tu
          n&apos;as plus qu&apos;à publier.
        </p>
        <div className="landing-cta-actions">
          <Link
            href="/create"
            className="btn-primary"
            style={{
              padding: "1rem 2.25rem",
              fontSize: "1.05rem",
              textDecoration: "none",
            }}
          >
            Créer ma pub →
          </Link>
          <Link href="#tarifs" className="landing-cta-secondary">
            Voir les tarifs
          </Link>
        </div>
        <p className="landing-cta-note">
          Paiement sécurisé · Annulation à tout moment
        </p>
      </div>
    </section>
  );
}
