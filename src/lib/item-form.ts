import { MAX_CLASS_YEAR } from "@/constants";
import { nairaToKobo } from "@/lib/money";
import type { ClassPriceField, ItemFormValues } from "@/types/item-form";
import type { ClassPrice, Item } from "@/types";

export const toLocal = (ms: number | null) => (ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

/** Classes the editor shows: 1..course duration, extended if the item already prices a higher class (so nothing is silently dropped on save). */
export function classYearList(courseYears: number, item?: Item): number[] {
  const duration = Number.isInteger(Number(courseYears)) && Number(courseYears) >= 1 ? Math.min(Number(courseYears), MAX_CLASS_YEAR) : 4; // never an empty list, even if settings are odd
  const saved = [...(item?.classPrices ?? []), ...(item?.subItems ?? []).flatMap((s) => s.classPrices ?? [])].map((c) => c.year);
  return Array.from({ length: Math.max(duration, ...saved) }, (_, i) => i + 1);
}

export const blankClassPrices = (years: number[]): ClassPriceField[] => years.map((year) => ({ year, priceNaira: "" }));

const fillClassPrices = (years: number[], saved?: ClassPrice[]): ClassPriceField[] =>
  years.map((year) => { const hit = saved?.find((c) => c.year === year); return { year, priceNaira: hit ? String(hit.priceKobo / 100) : "" }; });

export const emptyItemValues = (years: number[]): ItemFormValues => ({
  name: "", description: "", status: "DRAFT", startAt: "", endAt: "", hasSubItems: false, priceNaira: 0, subItems: [],
  classPricingEnabled: false, classPrices: blankClassPrices(years), variantSets: [],
  requiredProfileFields: [], batchProcessingEnabled: false, batchSize: 50, batchLimitEnabled: false, maxBatches: 5, nfcEnabled: false, nfcPayloadFields: ["PROFILE_URL"],
});

export const toFormValues = (item: Item, years: number[]): ItemFormValues => ({
  name: item.name, description: item.description, status: item.status, startAt: toLocal(item.startAt), endAt: toLocal(item.endAt), hasSubItems: item.hasSubItems, priceNaira: item.basePriceKobo / 100,
  subItems: item.subItems.map((s) => ({ id: s.id, name: s.name, description: s.description, required: s.required, priceNaira: s.priceKobo / 100, classPrices: fillClassPrices(years, s.classPrices) })),
  classPricingEnabled: item.classPrices.length > 0 || item.subItems.some((s) => (s.classPrices?.length ?? 0) > 0),
  classPrices: fillClassPrices(years, item.classPrices),
  variantSets: item.variantSets.map((v) => ({ id: v.id, name: v.name, selection: v.selection, required: v.required, options: v.options.map((o) => ({ id: o.id, label: o.label })) })),
  requiredProfileFields: item.requiredProfileFields, batchProcessingEnabled: item.batchProcessingEnabled, batchSize: item.batchSize,
  batchLimitEnabled: item.batchLimitEnabled, maxBatches: item.maxBatches, nfcEnabled: item.nfcEnabled, nfcPayloadFields: item.nfcPayloadFields,
});

/** Only classes with a filled-in price become overrides; blank classes pay the initial price. */
const classPriceList = (rows: ClassPriceField[]): ClassPrice[] =>
  rows.filter((r) => String(r.priceNaira).trim() !== "" && Number.isFinite(Number(r.priceNaira))).map((r) => ({ year: r.year, priceKobo: nairaToKobo(Number(r.priceNaira)) }));

/** The request body for POST/PATCH /api/admin/items. Switching class pricing off clears every override. */
export function toItemPayload(v: ItemFormValues) {
  const byClass = v.classPricingEnabled;
  return {
    name: v.name, description: v.description, status: v.status, startAt: v.startAt ? new Date(v.startAt).getTime() : null, endAt: v.endAt ? new Date(v.endAt).getTime() : null,
    hasSubItems: v.hasSubItems, basePriceKobo: v.hasSubItems ? 0 : nairaToKobo(Number(v.priceNaira)),
    classPrices: byClass && !v.hasSubItems ? classPriceList(v.classPrices) : [],
    subItems: v.hasSubItems ? v.subItems.map((s) => ({ id: s.id, name: s.name, description: s.description, priceKobo: nairaToKobo(Number(s.priceNaira)), required: s.required, classPrices: byClass ? classPriceList(s.classPrices) : [] })) : [],
    variantSets: v.variantSets.map((s) => ({ id: s.id, name: s.name.trim(), selection: s.selection, required: s.required, options: s.options.map((o) => ({ id: o.id, label: o.label.trim() })) })),
    requiredProfileFields: v.requiredProfileFields, batchProcessingEnabled: v.batchProcessingEnabled, batchSize: Number(v.batchSize), batchLimitEnabled: v.batchLimitEnabled, maxBatches: Number(v.maxBatches),
    nfcEnabled: v.nfcEnabled, nfcPayloadFields: v.nfcPayloadFields.length ? v.nfcPayloadFields : ["PROFILE_URL"],
  };
}

/** First problem in the variable sets, caught before the request so it's reported even when the Advanced section is collapsed. */
export function variantSetsProblem(sets: ItemFormValues["variantSets"]): string | null {
  for (const s of sets) {
    if (!s.name.trim()) return "Give every variable set a name.";
    if (s.options.length === 0) return `Add at least one value to "${s.name.trim()}".`;
  }
  const names = sets.map((s) => s.name.trim().toLowerCase());
  return new Set(names).size === names.length ? null : "Variable set names must be different.";
}
