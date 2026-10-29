"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Read-only value with a copy button (webhook URLs). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the value is still selectable */ }
  };
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] py-1 pl-3.5 pr-1">
        <code className="min-w-0 flex-1 select-all truncate text-[13px]">{value}</code>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition hover:text-[var(--accent)]">
          {copied ? <Check className="size-4 text-[var(--accent)]" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
