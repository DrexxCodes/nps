"use client";
import { Badge } from "@/components/ui/Badge";
import { VARIANT_SELECTION_LABELS } from "@/constants";
import type { VariantSet } from "@/types";

interface Props { set: VariantSet; value: string[]; onChange: (ids: string[]) => void }

/** One variable set at checkout: radio pills when the admin allows a single value, checkbox pills when several. */
export function VariantPicker({ set, value, onChange }: Props) {
  const single = set.selection === "SINGLE";
  const toggle = (id: string) => onChange(single ? [id] : value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 flex flex-wrap items-center gap-2 font-display text-base font-bold">
        {set.name}
        <Badge tone={set.required ? "amber" : "gray"}>{set.required ? "Required" : "Optional"}</Badge>
        <span className="text-xs font-normal text-[var(--muted)]">{VARIANT_SELECTION_LABELS[set.selection].student}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {set.options.map((o) => {
          const on = value.includes(o.id);
          return (
            <label key={o.id} className={`glass flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${on ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]" : "hover:bg-[var(--accent-soft)]"}`}>
              <input type={single ? "radio" : "checkbox"} name={set.id} checked={on} onChange={() => toggle(o.id)} className="size-4 accent-[var(--accent)]" />
              {o.label}
            </label>
          );
        })}
      </div>
      {single && !set.required && value.length > 0 && <button type="button" onClick={() => onChange([])} className="text-xs text-[var(--accent)] hover:underline">Clear selection</button>}
    </fieldset>
  );
}
