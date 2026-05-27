import Link from "next/link";
import AdCreativeLayout from "./components/AdCreativeLayout";

export default function AdCreativePage() {
  return (
    <div className="studio-page" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link
        href="/dashboard"
        className="btn-sec"
        style={{
          display: "inline-flex",
          marginBottom: 24,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        ← Mes pubs
      </Link>
      <AdCreativeLayout />
    </div>
  );
}
