import { describe, expect, it } from "vitest";
import { balancesOf, formatWait, maskAccount, normalizeCounters, releaseCutoff, releaseTime, settlementDay, sumBalances } from "@/lib/wallet";

describe("settlement day", () => {
  it("uses Africa/Lagos, not UTC", () => {
    expect(settlementDay(Date.parse("2026-10-29T22:59:00Z"))).toBe("2026-10-29");
    expect(settlementDay(Date.parse("2026-10-29T23:30:00Z"))).toBe("2026-10-30");
  });
});

describe("wallet balances", () => {
  it("splits collected money into available, awaiting release, requested and withdrawn", () => {
    const b = balancesOf(normalizeCounters({ grossKobo: 1000, releasedKobo: 600, withdrawnKobo: 100, reservedKobo: 200 }));
    expect(b).toEqual({ collectedKobo: 1000, awaitingReleaseKobo: 400, availableKobo: 300, requestedKobo: 200, withdrawnKobo: 100 });
  });
  it("treats a missing wallet as empty and never goes negative", () => {
    expect(balancesOf(normalizeCounters(undefined)).availableKobo).toBe(0);
    expect(balancesOf(normalizeCounters({ grossKobo: 100, releasedKobo: 100, withdrawnKobo: 150 })).availableKobo).toBe(0);
  });
  it("sums several items", () => {
    const total = sumBalances([balancesOf(normalizeCounters({ grossKobo: 10, releasedKobo: 10 })), balancesOf(normalizeCounters({ grossKobo: 5 }))]);
    expect(total).toMatchObject({ collectedKobo: 15, availableKobo: 10, awaitingReleaseKobo: 5 });
  });
});

describe("hold period", () => {
  it("a day is released once its last payment is at least the hold old", () => {
    const now = Date.parse("2026-10-30T12:00:00Z");
    const lastPaid = Date.parse("2026-10-29T12:00:00Z");
    expect(lastPaid <= releaseCutoff(now, 24)).toBe(true); // exactly 24 h old
    expect(lastPaid <= releaseCutoff(now, 25)).toBe(false);
    expect(lastPaid <= releaseCutoff(now, 0)).toBe(true); // 0 = no hold
  });
  it("computes when a held day opens, and never treats a negative hold as a bonus", () => {
    expect(releaseTime(1000, 1)).toBe(1000 + 3_600_000);
    expect(releaseTime(1000, -5)).toBe(1000);
  });
  it("formats waits", () => {
    expect(formatWait(0)).toBe("now");
    expect(formatWait(5 * 60_000)).toBe("5 min");
    expect(formatWait(90 * 60_000)).toBe("1 h 30 min");
  });
});

describe("account masking", () => {
  it("keeps only the last four digits", () => expect(maskAccount("0123456789")).toBe("******6789"));
});
