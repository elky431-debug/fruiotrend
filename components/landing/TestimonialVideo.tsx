"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  label: string;
};

export function TestimonialVideo({ src, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className="landing-testimonial-video"
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-label={label}
    />
  );
}
