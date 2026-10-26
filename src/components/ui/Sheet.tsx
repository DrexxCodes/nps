"use client";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Bottom sheet on phones, centered dialog on larger screens. Closes on Escape and backdrop tap. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="glass glass-strong relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl p-5 pb-8 [animation:sheet-up_.25s_ease-out] sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-[var(--accent-soft)]"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
