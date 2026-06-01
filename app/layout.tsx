import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PubMoi — Pubs dropshipping IA",
  description:
    "Crée des publicités 9:16 pour TikTok et Meta : script GPT, visuels Gemini, vidéo LTX.",
  icons: {
    icon: "/pubmoi-logo.png",
    apple: "/pubmoi-logo.png",
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
