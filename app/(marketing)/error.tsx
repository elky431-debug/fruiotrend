"use client";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0806",
        color: "#fff8f2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Erreur de chargement
      </h1>
      <p style={{ color: "#c4b5a8", marginBottom: 16, fontSize: 14 }}>
        {error.message || "La page n'a pas pu s'afficher."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary"
        style={{ marginRight: 8 }}
      >
        Réessayer
      </button>
      <a href="/" className="btn-sec" style={{ textDecoration: "none" }}>
        Accueil
      </a>
    </div>
  );
}
