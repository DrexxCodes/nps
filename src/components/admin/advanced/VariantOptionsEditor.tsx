"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { MAX_VARIANT_OPTIONS } from "@/constants";
import { shortId } from "@/lib/ids";
import { parseOptionLabels } from "@/lib/variants";
import type { ItemFormValues } from "@/types/item-form";

/** The values of one variable set, shown as removable chips, with a field that adds several at once ("S, M, L, XL"). */
export function VariantOptionsEditor({ index }: { index: number }) {
  const { control, getValues } = useFormContext<ItemFormValues>();
  const name = `variantSets.${index}.options` as const;
  const { fields, append, remove } = useFieldArray({ control, name });
  const [draft, setDraft] = useState("");

  const add = () => {
    const have = new Set(getValues(name).map((o) => o.label.trim().toLowerCase()));
    const fresh = parseOptionLabels(draft).filter((l) => !have.has(l.toLowerCase())).slice(0, MAX_VARIANT_OPTIONS - fields.length);
    if (fresh.length) append(fresh.map((label) => ({ id: shortId(), label })));
    setDraft("");
  };

  return (
    <div className="space-y-2.5">
      {fields.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Values in this set">
          {fields.map((f, i) => (
            <li key={f.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] py-1 pl-3 pr-1.5 text-sm font-medium text-[var(--accent)]">
              {f.label}
              <button type="button" aria-label={`Remove ${f.label}`} onClick={() => remove(i)} className="grid size-5 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-[var(--muted)]">No values yet. Add at least one below.</p>}
      <Input
        label="Add values" placeholder="e.g. S, M, L, XL" value={draft} disabled={fields.length >= MAX_VARIANT_OPTIONS}
        hint="Separate several with commas or new lines. Press Enter to add."
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        trailing={<Button type="button" size="sm" variant="ghost" disabled={!draft.trim()} onClick={add}>Add</Button>}
      />
    </div>
  );
}
