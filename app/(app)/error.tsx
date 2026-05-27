"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="app-page"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Erreur de chargement</h1>
      <p style={{ color: "var(--text2)", fontSize: 14, maxWidth: 420 }}>
        {error.message ||
          "Le cache de développement est peut-être corrompu. Relance le serveur avec .\\start-dev.ps1 -Clean puis rafraîchis la page."}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={reset} className="btn-primary">
          Réessayer
        </button>
        <Link href="/dashboard" className="btn-sec" style={{ textDecoration: "none" }}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
