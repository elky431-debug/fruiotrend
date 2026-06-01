"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que PubMoi ?",
    a: "Un outil pour créer des publicités dropshipping en format vertical 9:16 : script IA, visuels cartoon avec ton produit, puis vidéos animées prêtes pour TikTok et Meta.",
  },
  {
    q: "Quelles IA sont utilisées ?",
    a: "GPT-4o pour le script, Gemini pour les images, LTX 2.3 Fast (fal.ai) pour la vidéo et la voix intégrée, le tout assemblé en MP4.",
  },
  {
    q: "Ai-je besoin de compétences en montage ?",
    a: "Non pour la génération. Tu télécharges la pub finale ou les scènes et tu peux les republier telles quelles.",
  },
  {
    q: "Combien de crédits consomme une pub ?",
    a: "Chaque scène animée consomme des crédits fal selon ton plan. Le forfait gratuit permet de tester le flux complet.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="landing-faq-section">
      <div className="landing-faq-inner">
        <h2 className="landing-h2" style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          FAQ
        </h2>
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="landing-faq-item">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="landing-faq-btn"
              >
                <span>{item.q}</span>
                <span style={{ color: "#7a6f64", fontSize: "1.5rem" }}>
                  {open === i ? "−" : "+"}
                </span>
              </button>
              {open === i && (
                <p className="landing-faq-answer">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
