import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { SETTLE_BATCH } from "@/constants/withdrawals";
import { balancesOf, normalizeCounters, releaseCutoff, releaseTime, settlementDay } from "@/lib/wallet";
import type { SettlementDay, WalletBalances, WalletCounters } from "@/types/withdrawals";
import { db } from "./firebase-admin";

/**
 * Per-item wallet: `itemWallets/{itemId}` holds running totals, `itemWallets/{itemId}/days/{YYYY-MM-DD}` groups payments by settlement day.
 *
 * Why this shape (speed and cost):
 *  - A payment writes two small documents with blind increments inside the transaction that already creates the order, so
 *    the money record can never drift from the order and a retried webhook cannot double count.
 *  - Balances are one document read. Nothing ever scans orders or ledger entries.
 *  - "Released" money is advanced lazily (`settleWallet`): only days that have just passed the hold period are read, usually none
 *    or one. There is no cron over every item.
 *  - The hold is compared against each day's `lastPaidAt` at read time, so changing the hold applies to money not yet released.
 */
export const walletRef = (itemId: string) => db().doc(`itemWallets/${itemId}`);
const daysCol = (itemId: string) => walletRef(itemId).collection("days");

/** Called from confirmPayment's transaction (webhook and verify both land there). Returns the settlement day it was filed under. */
export function recordWalletSale(tx: Transaction, itemId: string, subtotalKobo: number, physical: boolean, paidAt: number): string {
  const day = settlementDay(paidAt);
  tx.set(walletRef(itemId), {
    itemId, grossKobo: FieldValue.increment(subtotalKobo), paidOrders: FieldValue.increment(1),
    ...(physical ? {} : { noCollectionOrders: FieldValue.increment(1) }), updatedAt: paidAt,
  }, { merge: true });
  // increment(0) creates `releasedKobo: 0` on a new day without touching an existing value
  tx.set(daysCol(itemId).doc(day), { day, amountKobo: FieldValue.increment(subtotalKobo), count: FieldValue.increment(1), releasedKobo: FieldValue.increment(0), lastPaidAt: paidAt, open: true }, { merge: true });
  return day;
}

export function recordWalletDelivery(tx: Transaction, itemId: string): void {
  tx.set(walletRef(itemId), { deliveredOrders: FieldValue.increment(1), updatedAt: Date.now() }, { merge: true });
}

/**
 * Moves every settlement day whose latest payment is older than the hold into `releasedKobo`. Safe to call concurrently
 * (days are re-read inside the transaction and skipped if someone else already released them). Returns the kobo released.
 */
export async function settleWallet(itemId: string, holdHours: number): Promise<number> {
  const cutoff = releaseCutoff(Date.now(), holdHours);
  let total = 0;
  for (let round = 0; round < 20; round++) {
    const due = await daysCol(itemId).where("open", "==", true).where("lastPaidAt", "<=", cutoff).limit(SETTLE_BATCH).get();
    if (due.empty) break;
    const released = await db().runTransaction(async (tx) => {
      const fresh = await tx.getAll(...due.docs.map((d) => d.ref));
      let sum = 0;
      for (const s of fresh) {
        const d = s.data();
        if (!d || d.open !== true || d.lastPaidAt > cutoff) continue;
        sum += d.amountKobo - d.releasedKobo;
        tx.update(s.ref, { releasedKobo: d.amountKobo, open: false, settledAt: Date.now() });
      }
      if (sum > 0) tx.set(walletRef(itemId), { releasedKobo: FieldValue.increment(sum), updatedAt: Date.now() }, { merge: true });
      return sum;
    });
    total += released;
    if (due.size < SETTLE_BATCH) break;
  }
  return total;
}

export interface ItemWallet { counters: WalletCounters; balances: WalletBalances; /** When the next held day becomes withdrawable, or null when nothing is held. */ nextReleaseAt: number | null }

/** One item: settles, then reads. Used on the item's Money page and before a withdrawal is requested. */
export async function loadWallet(itemId: string, holdHours: number): Promise<ItemWallet> {
  await settleWallet(itemId, holdHours);
  const [w, next] = await Promise.all([walletRef(itemId).get(), daysCol(itemId).where("open", "==", true).orderBy("lastPaidAt", "asc").limit(1).get()]);
  const counters = normalizeCounters(w.data());
  const last = next.docs[0]?.data().lastPaidAt as number | undefined;
  return { counters, balances: balancesOf(counters), nextReleaseAt: last === undefined ? null : releaseTime(last, holdHours) };
}

/**
 * Many items in ONE batched read. Only wallets that still have money inside the hold are settled (one small query each),
 * so a page of items with nothing pending costs exactly one read per item.
 */
export async function loadWallets(itemIds: string[], holdHours: number): Promise<Map<string, WalletCounters>> {
  const ids = [...new Set(itemIds)];
  const snaps = ids.length ? await db().getAll(...ids.map(walletRef)) : [];
  const out = new Map(ids.map((id, i) => [id, normalizeCounters(snaps[i]?.data())]));
  await Promise.all(ids.map(async (id) => {
    const c = out.get(id)!;
    if (c.grossKobo <= c.releasedKobo) return;
    const released = await settleWallet(id, holdHours);
    if (released > 0) out.set(id, { ...c, releasedKobo: c.releasedKobo + released });
  }));
  return out;
}

/** Every settlement day, newest first, for the PDF export. */
export async function loadSettlementDays(itemId: string): Promise<SettlementDay[]> {
  const snap = await daysCol(itemId).orderBy("day", "desc").limit(2000).get();
  return snap.docs.map((d) => { const x = d.data(); return { day: x.day as string, amountKobo: x.amountKobo as number, count: x.count as number, lastPaidAt: x.lastPaidAt as number, released: x.open !== true }; });
}
