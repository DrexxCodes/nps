"use client";
import { Loader2 } from "lucide-react";
import { useSsoContinue } from "@/hooks/useSsoContinue";

/** Fixed block for the sign-in pages: shown whenever the other app has a live session on this device. */
export function SsoInline({ signedIn }: { signedIn: boolean }) {
  const { offer, busy, accept } = useSsoContinue({ signedIn, ignoreDismissed: true });
  if (!offer) return null;
  return (
    <div className="mb-5 space-y-3">
      <div className="rounded-2xl bg-[var(--accent-soft)] p-4">
        <p className="text-sm">You&apos;re signed in to <strong>{offer.name}</strong> on this device as <strong>{offer.firstName}</strong>.</p>
      </div>
      <button onClick={accept} disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-[15px] font-semibold text-[var(--accent-fg)] shadow-sm hover:brightness-110 disabled:opacity-60">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}Continue with {offer.name}
      </button>
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />or sign in with your email<span className="h-px flex-1 bg-[var(--line)]" />
      </div>
    </div>
  );
}
