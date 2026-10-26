import "server-only";
import { db } from "./firebase-admin";

export interface Balance { grossKobo: number; platformFeesKobo: number; processorFeesKobo: number; netAttributableKobo: number; withdrawnKobo: number; pendingKobo: number; availableKobo: number }

/** Derived purely from immutable ledger entries — never from mutable dashboard counters. */
export async function balanceFor(ownerAdminId: string | null, itemId?: string): Promise<Balance> {
  let q = db().collection("financialLedger").where("ownerAdminId", "==", ownerAdminId);
  if (itemId) q = q.where("itemId", "==", itemId);
  const entries = (await q.get()).docs.map((d) => d.data());
  const sum = (type: string, status?: string) => entries.filter((e) => e.eventType === type && (!status || e.status === status)).reduce((n, e) => n + (e.amountKobo as number), 0);
  const gross = sum("PAYMENT") - sum("REFUND");
  const withdrawn = sum("WITHDRAWAL", "CONFIRMED");
  const pending = sum("WITHDRAWAL", "RESERVED");
  return { grossKobo: gross, platformFeesKobo: 0, processorFeesKobo: 0, netAttributableKobo: gross, withdrawnKobo: withdrawn, pendingKobo: pending, availableKobo: Math.max(0, gross - withdrawn - pending) };
}
