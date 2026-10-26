"use client";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Checkbox, Input } from "@/components/ui/Field";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { blankClassPrices } from "@/lib/item-form";
import type { ItemFormValues } from "@/types/item-form";

type GridName = "classPrices" | `subItems.${number}.classPrices`;

const initialLabel = (naira: number) => (Number.isFinite(naira) ? formatNaira(nairaToKobo(naira)) : "the initial price");

/** One input per class. Blank means that class pays the initial price. */
function PriceGrid({ name, title, initial, years }: { name: GridName; title: string; initial: number; years: number[] }) {
  const { register, watch, setValue } = useFormContext<ItemFormValues>();
  const rows = (watch(name as "classPrices") ?? []) as ItemFormValues["classPrices"];
  // Guarantee one row per class (each carries its `year`), keeping anything already typed.
  useEffect(() => {
    if (rows.length === years.length && years.every((y, i) => rows[i]?.year === y)) return;
    setValue(name as "classPrices", blankClassPrices(years).map((b) => rows.find((r) => r?.year === b.year) ?? b));
  }, [rows, years, name, setValue]);
  const path = (i: number) => `${name}.${i}.priceNaira` as `classPrices.${number}.priceNaira`;
  return (
    <div className="glass space-y-3 rounded-xl p-3.5">
      <p className="text-sm font-semibold">{title} <span className="font-normal text-[var(--muted)]">· initial price {initialLabel(initial)}</span></p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {years.map((year, i) => <Input key={year} label={`Year ${year} (₦)`} type="number" min={0} step="0.01" inputMode="decimal" placeholder={initialLabel(initial)} {...register(path(i))} />)}
      </div>
    </div>
  );
}

/** Price an item (or each sub-item) differently per class. A student's class comes from their admission number. */
export function ClassPricingEditor({ years }: { years: number[] }) {
  const { register, watch } = useFormContext<ItemFormValues>();
  const enabled = watch("classPricingEnabled");
  const bundle = watch("hasSubItems");
  const subItems = watch("subItems");
  const price = watch("priceNaira");
  return (
    <section className="space-y-4" aria-labelledby="class-pricing-title">
      <div>
        <h3 id="class-pricing-title" className="font-display text-base font-bold">Prices by class</h3>
        <p className="text-xs text-[var(--muted)]">The price you set above is the initial price. Give any class a different price and students in that class pay it. Students only ever see their own class's price.</p>
      </div>
      <Checkbox label="Charge different prices by class" {...register("classPricingEnabled")} />
      {enabled && (
        <div className="space-y-3">
          {!bundle && <PriceGrid name="classPrices" title="Item price" initial={price} years={years} />}
          {bundle && subItems.length === 0 && <p className="text-xs text-[var(--muted)]">Add sub-items in the Pricing section first, then set their class prices here.</p>}
          {bundle && subItems.map((s, i) => <PriceGrid key={s.id} name={`subItems.${i}.classPrices`} title={s.name || `Sub-item ${i + 1}`} initial={s.priceNaira} years={years} />)}
          <p className="text-xs text-[var(--muted)]">Classes left blank, and students who haven't added an admission number yet, pay the initial price.</p>
        </div>
      )}
    </section>
  );
}
