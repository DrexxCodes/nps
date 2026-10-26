import type { FeeSnapshot, PlatformSettings, Pricing, SubItem } from "@/types";

/** Integer-only fee maths. Percentage is in percent units (1.5 = 1.5%). Fee base = subtotal. */
export function snapshotFees(s: Pick<PlatformSettings, "platformFeeEnabled" | "platformFeePercentage" | "platformFeeFlatKobo" | "feeConfigVersion">): FeeSnapshot {
  return { version: s.feeConfigVersion, enabled: s.platformFeeEnabled, percentage: s.platformFeePercentage, flatKobo: s.platformFeeFlatKobo };
}

export function computePricing(subtotalKobo: number, fees: FeeSnapshot): Pricing {
  if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo < 0) throw new Error("Invalid subtotal");
  const platformFeeKobo = fees.enabled ? Math.round((subtotalKobo * Math.round(fees.percentage * 100)) / 10000) + fees.flatKobo : 0;
  return { subtotalKobo, platformFeeKobo, otherFeesKobo: 0, totalKobo: subtotalKobo + platformFeeKobo, feeSnapshot: fees };
}

export function selectSubItems(all: SubItem[], selectedIds: string[]): { ok: true; chosen: SubItem[] } | { ok: false } {
  const known = new Map(all.map((s) => [s.id, s]));
  const chosen: SubItem[] = [];
  for (const id of new Set(selectedIds)) {
    const s = known.get(id);
    if (!s) return { ok: false };
    chosen.push(s);
  }
  for (const s of all) if (s.required && !chosen.some((c) => c.id === s.id)) chosen.push(s);
  return chosen.length ? { ok: true, chosen } : { ok: false };
}

export const formatNaira = (kobo: number): string =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: kobo % 100 ? 2 : 0 }).format(kobo / 100);

export const nairaToKobo = (naira: number): number => Math.round(naira * 100);
