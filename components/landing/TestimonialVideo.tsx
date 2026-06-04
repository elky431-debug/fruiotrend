"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  label: string;
};

/** Charge et lit la vidéo uniquement quand la carte est visible (réduit latence landing). */
export function TestimonialVideo({ src, poster, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) {
          if (!el.dataset.loaded) {
            el.src = src;
            el.dataset.loaded = "1";
          }
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "80px", threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className="landing-media-img"
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      onLoadedData={() => setReady(true)}
      style={{ opacity: ready ? 1 : 0.85 }}
    />
  );
}
