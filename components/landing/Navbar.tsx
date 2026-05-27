import Link from "next/link";

export function Navbar() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(245, 182, 67, 0.12)",
        background: "rgba(10, 8, 6, 0.92)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "0 1rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
            color: "#fff8f2",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #e32b45, #f5b623)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            📢
          </span>
          <span>
            Ad<span style={{ color: "#e32b45" }}>Creative</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 14 }}>
          <a href="#tarifs" style={{ color: "#c4b5a8", textDecoration: "none" }}>
            Tarifs
          </a>
          <a href="#faq" style={{ color: "#c4b5a8", textDecoration: "none" }}>
            FAQ
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/login"
            style={{
              padding: "8px 16px",
              borderRadius: 99,
              border: "1px solid rgba(227, 43, 69, 0.35)",
              color: "#fff8f2",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Se connecter
          </Link>
          <Link href="/create" className="btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>
            Créer →
          </Link>
        </div>
      </div>
    </nav>
  );
}
