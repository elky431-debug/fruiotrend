import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

/** Logo horizontal (~3:2) — largeur d’affichage prioritaire */
const LOGO_WIDTHS = {
  sm: 120,
  md: 150,
  lg: 190,
} as const;

const LOGO_ASPECT = 1024 / 682;

export function PubMoiLogo({
  href = "/",
  size = "md",
  priority = false,
}: Props) {
  const displayWidth = LOGO_WIDTHS[size];
  const displayHeight = Math.round(displayWidth / LOGO_ASPECT);

  const img = (
    <Image
      src="/pubmoi-logo.png"
      alt="PubMoi"
      width={displayWidth}
      height={displayHeight}
      priority={priority}
      unoptimized
      className="pubmoi-logo-img"
      style={{
        ["--logo-w" as string]: `${displayWidth}px`,
        ["--logo-h" as string]: `${displayHeight}px`,
      }}
    />
  );

  if (!href) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
        {img}
      </span>
    );
  }

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      {img}
    </Link>
  );
}
