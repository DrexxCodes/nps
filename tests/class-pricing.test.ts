import { describe, expect, it } from "vitest";
import { priceForClass, pricingFingerprint, toStudentItem } from "@/lib/pricing";
import { itemSchema } from "@/lib/validation/schemas";
import type { Item } from "@/types";

const item = (over: Partial<Item> = {}): Item => ({
  id: "i1", name: "Hoodie", description: "", coverImageUrl: null, ownerAdminId: "a1", status: "ACTIVE", startAt: null, endAt: null, hasSubItems: false, subItems: [],
  basePriceKobo: 500000, classPrices: [{ year: 1, priceKobo: 400000 }, { year: 3, priceKobo: 600000 }], variantSets: [], requiredProfileFields: [],
  batchProcessingEnabled: false, batchSize: 50, batchLimitEnabled: false, maxBatches: 1, nfcEnabled: false, nfcPayloadFields: [], assignedStaffIds: [], createdAt: 0, updatedAt: 0, ...over,
});

describe("class pricing", () => {
  it("uses the class override, else the initial price", () => {
    const o = [{ year: 1, priceKobo: 400000 }];
    expect(priceForClass(500000, o, 1)).toBe(400000);
    expect(priceForClass(500000, o, 2)).toBe(500000);
    expect(priceForClass(500000, o, null)).toBe(500000); // no admission number yet
    expect(priceForClass(500000, o, 0)).toBe(500000); // incoming student before the October boundary
    expect(priceForClass(500000, undefined, 1)).toBe(500000);
  });

  it("resolves the student's price and never exposes other classes' prices", () => {
    const shown = toStudentItem(item(), 3);
    expect(shown.basePriceKobo).toBe(600000);
    expect(shown.classPrices).toEqual([]);
    expect(JSON.stringify(shown)).not.toContain("400000");
  });

  it("resolves bundle sub-items per class and strips their overrides", () => {
    const bundle = item({
      hasSubItems: true, basePriceKobo: 0, classPrices: [],
      subItems: [
        { id: "a", name: "Card", description: "", priceKobo: 300000, required: true, classPrices: [{ year: 2, priceKobo: 250000 }] },
        { id: "b", name: "Lanyard", description: "", priceKobo: 100000, required: false, classPrices: [] },
      ],
    });
    const y2 = toStudentItem(bundle, 2).subItems;
    expect(y2.map((s) => s.priceKobo)).toEqual([250000, 100000]);
    expect(y2.every((s) => !("classPrices" in s))).toBe(true);
    expect(toStudentItem(bundle, 1).subItems[0]?.priceKobo).toBe(300000);
  });

  it("treats a legacy item and the same item with empty class prices as unchanged", () => {
    const legacy = { basePriceKobo: 100, subItems: [{ id: "a", name: "A", description: "", priceKobo: 5, required: true }] };
    const saved = { basePriceKobo: 100, classPrices: [], subItems: [{ id: "a", name: "A", description: "", priceKobo: 5, required: true, classPrices: [] }] };
    expect(pricingFingerprint(saved)).toBe(pricingFingerprint(legacy));
    expect(pricingFingerprint({ ...saved, classPrices: [{ year: 1, priceKobo: 90 }] })).not.toBe(pricingFingerprint(saved));
  });
});

describe("item schema: class prices", () => {
  const base = { name: "Hoodie", basePriceKobo: 500000 };
  it("accepts one price per class and defaults to none", () => {
    expect(itemSchema.parse(base).classPrices).toEqual([]);
    expect(itemSchema.safeParse({ ...base, classPrices: [{ year: 1, priceKobo: 400000 }, { year: 2, priceKobo: 450000 }] }).success).toBe(true);
  });
  it("rejects duplicate classes, out-of-range classes and a free item price", () => {
    expect(itemSchema.safeParse({ ...base, classPrices: [{ year: 1, priceKobo: 1 }, { year: 1, priceKobo: 2 }] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, classPrices: [{ year: 7, priceKobo: 100 }] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, classPrices: [{ year: 1, priceKobo: 0 }] }).success).toBe(false);
  });
});
