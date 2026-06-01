import Link from "next/link";

import { PubMoiLogo } from "@/components/brand/PubMoiLogo";



export function Navbar() {

  return (

    <nav

      className="landing-nav"

      style={{

        position: "sticky",

        top: 0,

        zIndex: 50,

        borderBottom: "1px solid rgba(255, 92, 157, 0.14)",

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

        <PubMoiLogo href="/" size="md" priority />



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

