"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";

/**
 * Parallax photo for a `relative overflow-hidden` parent. The layer is taller than the parent and drifts down at
 * `speed` x the scroll distance, so it moves slower than the content. One passive scroll listener, one rAF per frame,
 * transform only. Skipped entirely for reduced-motion users.
 * A plain <img> with inline styles on purpose: it never depends on the image optimizer or on generated classes.
 */
export function ParallaxBg({ src, alt = "", speed = 0.3, position = "50% 30%" }: { src: string; alt?: string; speed?: number; position?: string }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    const host = el?.parentElement;
    if (!el || !host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return; // off-screen: do nothing
      el.style.transform = `translate3d(0, ${Math.max(0, -r.top * speed).toFixed(1)}px, 0)`;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    return () => { removeEventListener("scroll", queue); removeEventListener("resize", queue); if (raf) cancelAnimationFrame(raf); };
  }, [speed]);

  return (
    <div ref={layer} aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: "-30%", willChange: "transform" }}>
      <img src={src} alt={alt} decoding="async" fetchPriority="high"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
    </div>
  );
}
