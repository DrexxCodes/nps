"use client";
import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Lenis smooth scrolling for the landing page only (it unmounts, and native scroll returns, when you leave).
 * Reduced-motion users keep plain native scrolling: smoothWheel is switched off rather than swapping the tree,
 * so children never remount.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return <ReactLenis root options={{ smoothWheel: !reduced, anchors: true }}>{children}</ReactLenis>;
}
