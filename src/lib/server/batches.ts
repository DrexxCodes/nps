import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { pickupReadiness } from "@/lib/fulfilment";
import type { BatchStatus, Item, SessionUser } from "@/types";
import { db } from "./firebase-admin";
import { AppError } from "./errors";
import { auditInTx } from "./audit";
import { recordDelivery } from "./stats";

const NEXT: Record<BatchStatus, BatchStatus | null> = { QUEUED: "PROCESSING", PROCESSING: "READY_FOR_PICKUP", READY_FOR_PICKUP: null };

export async function listBatches(itemId: string) {
  const snap = await db().collection(`items/${itemId}/batches`).orderBy("batchNumber").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

/** Immutable once the batch-creation limit is reached (default policy, PRD 13.6 Example C). */
const sizeLocked = (item: Item, batchCount: number) => item.batchLimitEnabled && batchCount >= item.maxBatches;

export async function changeBatchStatus(user: SessionUser, item: Item, batchId: string, status: BatchStatus): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = db().doc(`items/${item.id}/batches/${batchId}`);
    const snap = await tx.get(ref);
    const b = snap.data();
    if (!b) throw new AppError("NOT_FOUND");
    if (b.paidCount < b.maxOrders) throw new AppError("VALIDATION_ERROR", { status: "A batch must be full before its status can change. Reduce its size to the paid order count to close it early." });
    if (NEXT[b.status as BatchStatus] !== status) throw new AppError("VALIDATION_ERROR", { status: `A ${String(b.status).toLowerCase()} batch can only move to ${(NEXT[b.status as BatchStatus] ?? "no further status").toLowerCase()}.` });
    tx.update(ref, { status, statusChangedAt: Date.now(), statusChangedBy: user.uid, updatedAt: Date.now() });
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: "BATCH_STATUS_CHANGED", resourceType: "batch", resourceId: batchId, metadata: { itemId: item.id, from: b.status, to: status } });
  });
}

export async function changeBatchSize(user: SessionUser, item: Item, batchId: string, maxOrders: number): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = db().doc(`items/${item.id}/batches/${batchId}`);
    const itemSnap = await tx.get(db().doc(`items/${item.id}`));
    const snap = await tx.get(ref);
    const b = snap.data();
    if (!b) throw new AppError("NOT_FOUND");
    if (sizeLocked(item, itemSnap.data()?.batchCount ?? 0)) throw new AppError("VALIDATION_ERROR", { maxOrders: "The batch limit has been reached, so batch sizes can no longer be edited." });
    if (b.status !== "QUEUED") throw new AppError("VALIDATION_ERROR", { maxOrders: "Only queued batches can be resized." });
    if (maxOrders < b.paidCount) throw new AppError("VALIDATION_ERROR", { maxOrders: `This batch already has ${b.paidCount} paid orders. The size cannot go below that.` });
    if (maxOrders < b.paidCount + b.reservedCount) throw new AppError("VALIDATION_ERROR", { maxOrders: `${b.reservedCount} checkout(s) are in progress. Try again once they complete or expire.` });
    tx.update(ref, { maxOrders, sizeChangedAt: Date.now(), sizeChangedBy: user.uid, updatedAt: Date.now() });
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: "BATCH_SIZE_CHANGED", resourceType: "batch", resourceId: batchId, metadata: { itemId: item.id, from: b.maxOrders, to: maxOrders } });
  });
}

/** Marks a single order delivered. Delivery is never inferred from batch status or NFC writes. */
export async function deliverOrder(user: SessionUser, item: Item, orderId: string): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = db().doc(`orders/${orderId}`);
    const snap = await tx.get(ref);
    const o = snap.data();
    if (!o || o.itemId !== item.id) throw new AppError("NOT_FOUND");
    if (o.paymentStatus !== "SUCCESSFUL") throw new AppError("FORBIDDEN");
    if (o.physical === false || o.fulfillmentStatus === "NOT_REQUIRED") throw new AppError("NO_COLLECTION_NEEDED");
    if (o.fulfillmentStatus === "DELIVERED") throw new AppError("ORDER_ALREADY_DELIVERED");
    if (item.batchProcessingEnabled) {
      const batch = o.batchId ? (await tx.get(db().doc(`items/${item.id}/batches/${o.batchId}`))).data() : null;
      const { ready } = pickupReadiness({ fulfillmentStatus: o.fulfillmentStatus, batchingEnabled: true, batchNumber: o.batchNumber ?? null, batchStatus: batch?.status ?? null, batchPending: !!o.batchPending });
      if (!ready) throw new AppError("ORDER_NOT_READY_FOR_PICKUP");
    }
    tx.update(ref, { fulfillmentStatus: "DELIVERED", deliveredAt: Date.now(), deliveredBy: user.uid, updatedAt: Date.now() });
    recordDelivery(tx, item.ownerAdminId);
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: "ORDER_DELIVERED", resourceType: "order", resourceId: orderId, metadata: { itemId: item.id } });
  });
}

export { FieldValue };
