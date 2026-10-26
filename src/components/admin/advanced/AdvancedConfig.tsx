"use client";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ItemFormValues } from "@/types/item-form";
import { ClassPricingEditor } from "./ClassPricingEditor";
import { VariantSetsEditor } from "./VariantSetsEditor";

/** Collapsible "Advanced configuration" card: variable sets and class pricing. Opens by default when the item already uses them. */
export function AdvancedConfig({ years }: { years: number[] }) {
  const { getValues, watch } = useFormContext<ItemFormValues>();
  const [open, setOpen] = useState(() => { const v = getValues(); return v.variantSets.length > 0 || v.classPricingEnabled; });
  const sets = watch("variantSets").length;
  const byClass = watch("classPricingEnabled");
  return (
    <Card className="space-y-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><SlidersHorizontal className="size-4" aria-hidden /></span>
          <span>
            <span className="block font-display text-lg font-bold">Advanced configuration</span>
            <span className="block text-xs text-[var(--muted)]">Variable sets (size, colour…) and prices by class</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {sets > 0 && <Badge tone="green">{sets} set{sets > 1 ? "s" : ""}</Badge>}
          {byClass && <Badge tone="blue">By class</Badge>}
          <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && <div className="space-y-7 border-t border-[var(--line)] pt-5"><VariantSetsEditor /><ClassPricingEditor years={years} /></div>}
    </Card>
  );
}
