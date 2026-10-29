"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Field";

export interface BankOption { name: string; code: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Type-to-filter bank picker. `value` is the bank code ("" until one is picked); typing again after a pick clears it, so a stale code can never be submitted under a different name. */
export function BankPicker({ banks, value, onChange, label = "Bank", placeholder = "Type your bank, e.g. Zenith" }: { banks: BankOption[]; value: string; onChange: (code: string) => void; label?: string; placeholder?: string }) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Keep the text in step when the parent sets or clears the value (e.g. after a successful submit).
  const typedClear = useRef(false);
  useEffect(() => {
    const picked = banks.find((b) => b.code === value);
    if (picked) setText(picked.name);
    else if (value === "" && !typedClear.current) setText("");
    typedClear.current = false;
  }, [value, banks]);

  const matches = useMemo(() => {
    const words = norm(text).split(" ").filter(Boolean);
    if (!words.length) return banks;
    const picked = banks.find((b) => b.code === value);
    if (picked && picked.name === text) return banks; // just picked: show the full list if reopened
    return banks.filter((b) => { const n = norm(b.name); return words.every((w) => n.includes(w)); });
  }, [banks, text, value]);

  useEffect(() => { setActive(0); }, [text]);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const pick = (b: BankOption) => { setText(b.name); setOpen(false); onChange(b.code); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && open && matches[active]) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].code}` : undefined}
        autoComplete="off"
        placeholder={banks.length ? placeholder : "Loading banks…"}
        disabled={!banks.length}
        value={text}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        onChange={(e) => { setText(e.target.value); setOpen(true); if (value) { typedClear.current = true; onChange(""); } }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] p-1 text-[15px] shadow-lg backdrop-blur">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-[var(--muted)]">No bank matches “{text}”</li>}
          {matches.map((b, i) => (
            <li
              key={b.code}
              id={`${listId}-${b.code}`}
              role="option"
              aria-selected={b.code === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(b); }}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-[var(--accent-soft)]" : ""} ${b.code === value ? "font-semibold" : ""}`}
            >{b.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
