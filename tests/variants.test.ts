import { describe, expect, it } from "vitest";
import { layoutColumns } from "@/lib/pdf/columns";
import { describeVariants, parseOptionLabels, validateVariantSelection } from "@/lib/variants";
import { checkoutSchema, itemSchema } from "@/lib/validation/schemas";
import type { VariantSet } from "@/types";

const size: VariantSet = { id: "size", name: "Size", selection: "SINGLE", required: true, options: [{ id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }] };
const colour: VariantSet = { id: "col", name: "Colour", selection: "MULTIPLE", required: false, options: [{ id: "r", label: "Red" }, { id: "b", label: "Blue" }] };

describe("variable set selection", () => {
  it("requires required sets and allows skipping optional ones", () => {
    expect(validateVariantSelection([size, colour], {})).toEqual({ ok: false, errors: { size: "Choose an option for Size" } });
    const r = validateVariantSelection([size, colour], { size: ["m"] });
    expect(r.ok && r.chosen).toEqual([{ setId: "size", setName: "Size", options: [{ id: "m", label: "M" }] }]);
  });
  it("lets multiple-choice sets take several values, in the admin's order", () => {
    const r = validateVariantSelection([colour], { col: ["b", "r"] });
    expect(r.ok && r.chosen[0]?.options.map((o) => o.label)).toEqual(["Red", "Blue"]);
  });
  it("rejects several values for a single-choice set, and unknown sets or values", () => {
    expect(validateVariantSelection([size], { size: ["s", "m"] }).ok).toBe(false);
    expect(validateVariantSelection([size], { size: ["xxl"] }).ok).toBe(false);
    expect(validateVariantSelection([size], { size: ["s"], ghost: ["x"] }).ok).toBe(false);
    expect(validateVariantSelection([size], { size: ["s"], ghost: [] }).ok).toBe(true); // empty leftovers are harmless
  });
  it("describes picks for orders, tables and handover", () => {
    expect(describeVariants([{ setId: "size", setName: "Size", options: [{ id: "m", label: "M" }] }, { setId: "col", setName: "Colour", options: [{ id: "r", label: "Red" }, { id: "b", label: "Blue" }] }])).toBe("Size: M · Colour: Red, Blue");
    expect(describeVariants(undefined)).toBe("");
  });
  it("parses pasted value lists", () => {
    expect(parseOptionLabels("S, M,l\n XL;  s ,")).toEqual(["S", "M", "l", "XL"]);
  });
});

describe("item schema: variable sets", () => {
  const base = { name: "Hoodie", basePriceKobo: 500000 };
  it("accepts several sets and defaults to none", () => {
    expect(itemSchema.parse(base).variantSets).toEqual([]);
    expect(itemSchema.safeParse({ ...base, variantSets: [size, colour] }).success).toBe(true);
  });
  it("rejects empty sets, duplicate values and duplicate set names", () => {
    expect(itemSchema.safeParse({ ...base, variantSets: [{ ...size, options: [] }] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, variantSets: [{ ...size, options: [{ id: "a", label: "M" }, { id: "b", label: "m" }] }] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, variantSets: [size, { ...colour, name: "size" }] }).success).toBe(false);
  });
  it("lets checkout carry picks and defaults them", () => {
    expect(checkoutSchema.parse({ itemId: "i" }).variants).toEqual({});
    expect(checkoutSchema.parse({ itemId: "i", variants: { size: ["m"] } }).variants).toEqual({ size: ["m"] });
  });
});

describe("PDF columns", () => {
  const total = (cols: { w: string }[]) => cols.reduce((n, c) => n + Number.parseFloat(c.w), 0);
  it("keeps the original layout when there are no variable sets", () => {
    expect(layoutColumns([]).map((c) => c.key)).toEqual(["name", "academicYear", "amount", "admissionNumber", "paidAt", "notes"]);
  });
  it("adds one column per set and always totals 100%", () => {
    for (const n of [0, 1, 2, 3]) {
      const sets = Array.from({ length: n }, (_, i) => ({ id: `s${i}`, label: `Set ${i}` }));
      const cols = layoutColumns(sets);
      expect(total(cols)).toBe(100);
      expect(cols.filter((c) => c.kind === "variant")).toHaveLength(n);
      expect(cols.at(-1)?.key).toBe("notes");
    }
  });
  it("folds many sets into one Options column", () => {
    const cols = layoutColumns(Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, label: `Set ${i}` })));
    expect(total(cols)).toBe(100);
    expect(cols.filter((c) => c.kind === "options")).toHaveLength(1);
    expect(cols.some((c) => c.kind === "variant")).toBe(false);
  });
});
