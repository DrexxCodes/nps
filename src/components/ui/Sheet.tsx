"use client";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface OverlayProps { open: boolean; onClose: () => void; title: string; children: ReactNode }

/** Escape closes, the page behind stops scrolling, and tapping the backdrop closes. */
function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-[var(--accent-soft)]"><X className="size-5" /></button>
    </div>
  );
}

/**
 * Bottom sheet: glides up from the bottom edge on every screen size (centred and width-capped on large screens).
 * For short prompts and confirmations: a reason, "are you sure", a quick choice.
 */
export function Sheet({ open, onClose, title, children }: OverlayProps) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="glass glass-strong relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-8 [animation:sheet-up_.25s_ease-out]">
        <Header title={title} onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

/**
 * Side drawer: glides in from the right edge and fills the screen height (full width on phones, capped on larger screens).
 * For longer tasks that deserve room: multi-field forms, details, step-by-step completion.
 */
export function Drawer({ open, onClose, title, children }: OverlayProps) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="glass glass-strong relative h-dvh w-full max-w-md overflow-y-auto p-5 pb-8 sm:rounded-l-3xl [animation:drawer-in_.25s_ease-out]">
        <Header title={title} onClose={onClose} />
        {children}
      </div>
    </div>
  );
}
