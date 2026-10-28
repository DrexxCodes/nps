"use client";
import { Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SSO_INLINE_PAGES, useSsoContinue } from "@/hooks/useSsoContinue";
import { ensureSsoCookie } from "@/lib/client/sso";
import { PLATFORMS, SELF } from "@/lib/sso/platforms";

/**
 * Both halves of cross-app sign-in, driven by whether the server saw an NPS session:
 *  - signed in: quietly tell DARS so (no-op once the hint cookie already lists NPS);
 *  - signed out: if DARS has a live session on this device, offer "Continue as ..." (sign-in pages use SsoInline instead).
 */
export function SsoBridge({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { offer, busy, accept, dismiss } = useSsoContinue({ signedIn, enabled: !SSO_INLINE_PAGES.includes(pathname) });

  useEffect(() => { if (signedIn) void ensureSsoCookie(); }, [signedIn]);

  if (!offer) return null;
  return (
    <div role="region" aria-label={`Continue with ${offer.name}`} className="glass glass-strong fixed inset-x-3 top-20 z-[55] mx-auto max-w-sm rounded-2xl p-4 [animation:sheet-up_.25s_ease-out] sm:inset-x-auto sm:right-4 sm:mx-0">
      <button onClick={dismiss} aria-label="Not now" className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full hover:bg-[var(--accent-soft)]"><X className="size-4" /></button>
      <div className="pr-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Welcome back, {offer.firstName}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">You&apos;re already signed in to {offer.name} on this device. Continue to {PLATFORMS[SELF].name} without a password?</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} disabled={busy} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] shadow-sm hover:brightness-110 disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}Continue as {offer.firstName}
        </button>
        <button onClick={dismiss} disabled={busy} className="h-10 rounded-xl px-3 text-sm font-medium hover:bg-[var(--accent-soft)]">Not now</button>
      </div>
    </div>
  );
}
