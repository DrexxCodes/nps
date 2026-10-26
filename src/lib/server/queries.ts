import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { db } from "./firebase-admin";

type Row = Record<string, any> & { id: string }; // eslint-disable-line @typescript-eslint/no-explicit-any

const byNewest = (a: Row, b: Row) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
const rows = (docs: FirebaseFirestore.QueryDocumentSnapshot[]): Row[] => docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);

export const ordersForUser = async (uid: string) => rows((await db().collection("orders").where("userId", "==", uid).get()).docs);
export const transactionsForUser = async (uid: string) => rows((await db().collection("transactions").where("userId", "==", uid).get()).docs);

/** Batch status for student-facing order tracking. */
export async function batchStatus(itemId: string, batchId: string | null): Promise<string | null> {
  if (!batchId) return null;
  return ((await db().doc(`items/${itemId}/batches/${batchId}`).get()).data()?.status as string) ?? null;
}

export const ORDERS_PAGE_SIZE = 20;

/** Cursor = "<paidAt>_<orderId>": stable even when two orders were paid in the same millisecond. */
export function parseOrderCursor(raw: string | undefined): { paidAt: number; id: string } | null {
  const m = /^(\d{10,16})_([A-Za-z0-9]{10,40})$/.exec(raw ?? "");
  return m ? { paidAt: Number(m[1]), id: m[2]! } : null;
}

/**
 * One page of an item's paid orders, newest first, plus the total via a count aggregation (index entries, not documents).
 * Orders are only ever created once a payment is confirmed, so every document here is a paid order.
 * Needs the composite index orders(itemId ASC, paidAt DESC): see firestore.indexes.json.
 */
export async function paidOrdersPage(itemId: string, cursor: { paidAt: number; id: string } | null, size = ORDERS_PAGE_SIZE) {
  let q = db().collection("orders").where("itemId", "==", itemId).orderBy("paidAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(size + 1);
  if (cursor) q = q.startAfter(cursor.paidAt, cursor.id);
  const [snap, total] = await Promise.all([q.get(), db().collection("orders").where("itemId", "==", itemId).count().get()]);
  const page = snap.docs.slice(0, size);
  const last = page[page.length - 1];
  return { rows: page.map((d) => ({ id: d.id, ...d.data() })) as Row[], total: total.data().count, next: snap.docs.length > size && last ? `${last.data().paidAt}_${last.id}` : null };
}

/** Latest paid orders across several items (staff view), without reading every order. Firestore allows 30 values per "in". */
export async function recentPaidOrdersForItems(itemIds: string[], limit = 100): Promise<Row[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < itemIds.length; i += 30) chunks.push(itemIds.slice(i, i + 30));
  const snaps = await Promise.all(chunks.map((c) => db().collection("orders").where("itemId", "in", c).orderBy("paidAt", "desc").limit(limit).get()));
  return snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Row)).sort((a, b) => b.paidAt - a.paidAt).slice(0, limit);
}

/** The newest paid orders for an owner (null = whole platform). Needs orders(itemOwnerId ASC, paidAt DESC) for owners; falls back to a bounded scan until it is deployed. */
export async function recentSales(ownerAdminId: string | null, n = 5): Promise<Row[]> {
  const col = db().collection("orders");
  try {
    const q = (ownerAdminId ? col.where("itemOwnerId", "==", ownerAdminId) : col).orderBy("paidAt", "desc").limit(n);
    return (await q.get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Row);
  } catch (e) {
    if ((e as { code?: number }).code !== 9 || !ownerAdminId) throw e; // 9 = FAILED_PRECONDITION: composite index missing
    console.warn("[queries] recentSales: deploy firestore.indexes.json (firebase deploy --only firestore:indexes). Using a bounded scan meanwhile.");
    const snap = await col.where("itemOwnerId", "==", ownerAdminId).limit(100).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Row).sort((a, b) => b.paidAt - a.paidAt).slice(0, n);
  }
}
