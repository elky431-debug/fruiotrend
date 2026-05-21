"use client";

import { useState } from "react";
import { FAQ_ITEMS } from "@/types/drama";

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-10 text-center text-3xl font-extrabold">FAQ</h2>
        <div className="divide-y divide-bg-card border-t border-bg-card">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border-b border-bg-card">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left text-white transition hover:text-accent"
              >
                <span className="pr-4 font-medium">{item.q}</span>
                <span className="text-2xl text-text-secondary">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && (
                <p className="pb-5 text-sm text-text-secondary">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
