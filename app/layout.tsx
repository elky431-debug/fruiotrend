import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom utilisateur conservé pour l'accessibilité ; le zoom auto iOS au focus
  // est évité côté CSS (inputs à 16px sur mobile).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PubMoi — Pubs dropshipping IA",
  description:
    "Crée des publicités 9:16 pour TikTok et Meta avec l'IA PubMoi : script, visuels et vidéo en quelques minutes.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
