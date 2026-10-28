"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Runs in <head> before first paint: flags installed-app launches so CSS can hide the landing page instantly. */
export const pwaScript = `try{if(matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true)document.documentElement.setAttribute("data-pwa","1")}catch(e){}`;

/**
 * The installed PWA has no use for the marketing landing page. On "/", when running standalone,
 * send signed-out users to sign in and signed-in users to their own home. Browsers are unaffected.
 */
export function PwaEntry({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (document.documentElement.hasAttribute("data-pwa")) router.replace(href);
  }, [href, router]);
  return null;
}
