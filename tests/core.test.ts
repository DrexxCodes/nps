import { describe, expect, it } from "vitest";
import { academicYear, exceedsCourseDuration, normalizePhone, validateAdmissionNumber } from "@/lib/admission";
import { computePricing, selectSubItems } from "@/lib/money";
import { isPurchasable, resolveItemStatus } from "@/lib/item-status";

describe("admission numbers", () => {
  const now = new Date("2026-10-21T10:00:00Z");
  it("requires 134 for regular and 133 for CEP", () => {
    expect(validateAdmissionNumber("2024134106", "REGULAR", now).ok).toBe(true);
    expect(validateAdmissionNumber("2025133004", "CEP", now).ok).toBe(true);
    expect(validateAdmissionNumber("2024134106", "CEP", now)).toEqual({ ok: false, code: "ADMISSION_CODE_MISMATCH" });
    expect(validateAdmissionNumber("2025133004", "REGULAR", now)).toEqual({ ok: false, code: "ADMISSION_CODE_MISMATCH" });
  });
  it("requires exactly 10 digits", () => {
    for (const bad of ["202413410", "20241341066", "2024134A06", ""]) expect(validateAdmissionNumber(bad, "REGULAR", now)).toEqual({ ok: false, code: "INVALID_ADMISSION_NUMBER" });
  });
});

describe("academic year", () => {
  it("follows the October boundary", () => {
    // PRD 5.7 formula: Oct-Dec => Y - admissionYear + 1, Jan-Sep => Y - admissionYear
    expect(academicYear(2024, new Date("2025-09-15T00:00:00Z"))).toBe(1);
    expect(academicYear(2024, new Date("2025-10-01T00:00:00Z"))).toBe(2);
    expect(academicYear(2024, new Date("2024-10-20T00:00:00Z"))).toBe(1);
  });
  it("flags students beyond course duration", () => {
    expect(exceedsCourseDuration(2020, new Date("2025-10-05T00:00:00Z"), 5)).toBe(true);
    expect(exceedsCourseDuration(2020, new Date("2025-09-05T00:00:00Z"), 5)).toBe(false);
  });
});

describe("pricing", () => {
  const off = { version: 1, enabled: false, percentage: 0, flatKobo: 0 };
  it("charges only the subtotal when fees are off", () => expect(computePricing(450000, off).totalKobo).toBe(450000));
  it("applies percentage + flat in integer kobo", () => {
    const p = computePricing(450000, { version: 2, enabled: true, percentage: 1.5, flatKobo: 10000 });
    expect(p.platformFeeKobo).toBe(6750 + 10000);
    expect(p.totalKobo).toBe(450000 + 16750);
  });
  it("rejects unknown sub-items and always adds required ones", () => {
    const subs = [
      { id: "a", name: "Card", description: "", priceKobo: 300000, required: true },
      { id: "b", name: "Lanyard", description: "", priceKobo: 100000, required: false },
    ];
    expect(selectSubItems(subs, ["zzz"]).ok).toBe(false);
    const r = selectSubItems(subs, ["b"]);
    expect(r.ok && r.chosen.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });
});

describe("misc", () => {
  it("normalizes phones", () => {
    expect(normalizePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("123")).toBeNull();
  });
  it("respects purchase windows", () => {
    expect(isPurchasable({ status: "ACTIVE", startAt: null, endAt: 10 }, 20)).toBe(false);
    expect(isPurchasable({ status: "PAUSED", startAt: null, endAt: null }, 20)).toBe(false);
    expect(isPurchasable({ status: "SCHEDULED", startAt: 5, endAt: null }, 20)).toBe(true);
  });
  it("applies the schedule to the stored status", () => {
    expect(resolveItemStatus({ status: "SCHEDULED", startAt: 5, endAt: null }, 20)).toBe("ACTIVE");
    expect(resolveItemStatus({ status: "SCHEDULED", startAt: 50, endAt: null }, 20)).toBe("SCHEDULED");
    expect(resolveItemStatus({ status: "ACTIVE", startAt: null, endAt: 10 }, 20)).toBe("ENDED");
    expect(resolveItemStatus({ status: "SCHEDULED", startAt: 5, endAt: 10 }, 20)).toBe("ENDED");
    expect(resolveItemStatus({ status: "ACTIVE", startAt: null, endAt: null }, 20)).toBe("ACTIVE");
    for (const s of ["DRAFT", "PAUSED", "SUSPENDED", "ARCHIVED", "ENDED"] as const) expect(resolveItemStatus({ status: s, startAt: 5, endAt: 10 }, 20)).toBe(s);
  });
});
