import { SETTLEMENT_TIMEZONE } from "@/constants/withdrawals";
import type { WalletBalances, WalletCounters } from "@/types/withdrawals";

/** Pure money rules for item wallets. No Firestore here, so they are unit-tested directly (tests/wallet.test.ts). */

export const EMPTY_COUNTERS: WalletCounters = { grossKobo: 0, releasedKobo: 0, withdrawnKobo: 0, reservedKobo: 0, paidOrders: 0, deliveredOrders: 0, noCollectionOrders: 0 };

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Turns a raw wallet document (or nothing) into complete counters. */
export function normalizeCounters(d: Record<string, unknown> | undefined | null): WalletCounters {
  return {
    grossKobo: num(d?.grossKobo), releasedKobo: num(d?.releasedKobo), withdrawnKobo: num(d?.withdrawnKobo), reservedKobo: num(d?.reservedKobo),
    paidOrders: num(d?.paidOrders), deliveredOrders: num(d?.deliveredOrders), noCollectionOrders: num(d?.noCollectionOrders),
  };
}

export function balancesOf(c: WalletCounters): WalletBalances {
  return {
    collectedKobo: c.grossKobo,
    awaitingReleaseKobo: Math.max(0, c.grossKobo - c.releasedKobo),
    availableKobo: Math.max(0, c.releasedKobo - c.withdrawnKobo - c.reservedKobo),
    requestedKobo: c.reservedKobo,
    withdrawnKobo: c.withdrawnKobo,
  };
}

export function sumBalances(list: WalletBalances[]): WalletBalances {
  return list.reduce<WalletBalances>((t, b) => ({
    collectedKobo: t.collectedKobo + b.collectedKobo, awaitingReleaseKobo: t.awaitingReleaseKobo + b.awaitingReleaseKobo, availableKobo: t.availableKobo + b.availableKobo,
    requestedKobo: t.requestedKobo + b.requestedKobo, withdrawnKobo: t.withdrawnKobo + b.withdrawnKobo,
  }), { collectedKobo: 0, awaitingReleaseKobo: 0, availableKobo: 0, requestedKobo: 0, withdrawnKobo: 0 });
}

const HOUR_MS = 3_600_000;

/** A settlement day is released once its latest payment is at least `holdHours` old. Returns the newest `lastPaidAt` that qualifies. */
export const releaseCutoff = (now: number, holdHours: number): number => now - Math.max(0, holdHours) * HOUR_MS;

/** When a day whose latest payment was at `lastPaidAt` becomes withdrawable. */
export const releaseTime = (lastPaidAt: number, holdHours: number): number => lastPaidAt + Math.max(0, holdHours) * HOUR_MS;

/** "YYYY-MM-DD" in the settlement timezone. */
export function settlementDay(ms: number, timeZone = SETTLEMENT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

/** Fixed zone so server and browser always print the same text (no hydration mismatch). */
export function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("en-NG", { timeZone: SETTLEMENT_TIMEZONE, dateStyle: "medium", timeStyle: "short" });
}

/** Pure helper: "in 5 h 20 min" / "now". */
export function formatWait(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Last four digits only, for lists that don't need the full number. */
export const maskAccount = (n: string): string => `******${n.slice(-4)}`;
