import type { ClassPrice, Item, SubItem } from "@/types";

/** A student's price: their class's override if the admin set one, otherwise the initial price. */
export function priceForClass(initialKobo: number, overrides: ClassPrice[] | undefined, year: number | null): number {
  if (year === null || !overrides?.length) return initialKobo;
  return overrides.find((o) => o.year === year)?.priceKobo ?? initialKobo;
}

/**
 * The only shape of an item a student (or a signed-out visitor) may ever receive: prices are already resolved for
 * `year`, and every class override is removed, so other classes' prices can't leak through props, JSON or order snapshots.
 */
export function toStudentItem(item: Item, year: number | null): Item {
  return {
    ...item,
    basePriceKobo: priceForClass(item.basePriceKobo, item.classPrices, year),
    classPrices: [],
    subItems: item.subItems.map(({ classPrices, ...s }) => ({ ...s, priceKobo: priceForClass(s.priceKobo, classPrices, year) })),
  };
}

const normClass = (c?: ClassPrice[]) => [...(c ?? [])].sort((a, b) => a.year - b.year).map((x) => [x.year, x.priceKobo]);

/**
 * Stable summary of everything that sets a price, used to detect price edits. Normalized so a legacy item (no
 * `classPrices` field) and the same item saved with `classPrices: []` compare equal.
 */
export function pricingFingerprint(p: { basePriceKobo: number; classPrices?: ClassPrice[]; subItems: SubItem[] }): string {
  return JSON.stringify([p.basePriceKobo, normClass(p.classPrices), p.subItems.map((s) => [s.id, s.name, s.description, s.priceKobo, s.required, normClass(s.classPrices)])]);
}
