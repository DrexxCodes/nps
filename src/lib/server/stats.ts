import "server-only";
import { AggregateField, FieldValue, type Transaction } from "firebase-admin/firestore";
import { db } from "./firebase-admin";

/**
 * Running sales totals, so dashboards read one small document instead of every order.
 * Two documents move together on every sale: the owning admin's (`stats/owner_{uid}`) and the platform's (`stats/platform`).
 * All writes are blind FieldValue.increment calls inside the same transaction that creates/updates the order, so a
 * counter can never drift from the order it counts, and a retried or duplicate webhook cannot double count (the
 * transaction exits early once the reference is SUCCESSFUL).
 */
export interface SalesStats { paidOrders: number; grossKobo: number; deliveredOrders: number; /** paid orders with nothing to collect (dues etc.) */ noCollectionOrders: number }

export const salesStatsPaths = (ownerAdminId: string): string[] => [`stats/owner_${ownerAdminId}`, "stats/platform"];

export function recordSale(tx: Transaction, ownerAdminId: string, subtotalKobo: number, physical = true): void {
  for (const path of salesStatsPaths(ownerAdminId)) {
    tx.set(db().doc(path), { paidOrders: FieldValue.increment(1), grossKobo: FieldValue.increment(subtotalKobo), ...(physical ? {} : { noCollectionOrders: FieldValue.increment(1) }), updatedAt: Date.now() }, { merge: true });
  }
}

export function recordDelivery(tx: Transaction, ownerAdminId: string): void {
  for (const path of salesStatsPaths(ownerAdminId)) {
    tx.set(db().doc(path), { deliveredOrders: FieldValue.increment(1), updatedAt: Date.now() }, { merge: true });
  }
}

/** `ownerAdminId` null = the whole platform (Super Admin). */
export async function getSalesStats(ownerAdminId: string | null): Promise<SalesStats> {
  const d = (await db().doc(ownerAdminId ? `stats/owner_${ownerAdminId}` : "stats/platform").get()).data();
  if (d?.seeded === true) return { paidOrders: d.paidOrders ?? 0, grossKobo: d.grossKobo ?? 0, deliveredOrders: d.deliveredOrders ?? 0, noCollectionOrders: d.noCollectionOrders ?? 0 };

  // Counters not seeded yet (orders from before they existed): count with aggregation queries, which read index entries, not documents.
  // Run `npm run backfill:sales` once to seed them.
  const base = db().collection("orders").where("paymentStatus", "==", "SUCCESSFUL");
  const scoped = ownerAdminId ? base.where("itemOwnerId", "==", ownerAdminId) : base;
  const [all, delivered, none] = await Promise.all([
    scoped.aggregate({ n: AggregateField.count(), gross: AggregateField.sum("subtotal") }).get(),
    scoped.where("fulfillmentStatus", "==", "DELIVERED").count().get(),
    scoped.where("fulfillmentStatus", "==", "NOT_REQUIRED").count().get(),
  ]);
  return { paidOrders: all.data().n, grossKobo: all.data().gross ?? 0, deliveredOrders: delivered.data().count, noCollectionOrders: none.data().count };
}
