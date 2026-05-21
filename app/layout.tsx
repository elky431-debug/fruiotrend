import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FruitDrama — Crée des vidéos de Fruits IA",
  description: "Générateur de vidéos fruits dramatiques pour TikTok, Reels et Shorts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body
        className={inter.className}
        style={{ background: "#050505", minHeight: "100vh" }}
      >
        {children}
      </body>
    </html>
  );
}
