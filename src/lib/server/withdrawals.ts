import "server-only";
import { FieldValue, FieldPath, type DocumentData } from "firebase-admin/firestore";
import { MAX_PENDING_PER_ITEM, MAX_WITHDRAWAL_HISTORY, MIN_WITHDRAWAL_KOBO, PDF_MAX_WITHDRAWALS, QUEUE_LIMIT } from "@/constants/withdrawals";
import type { SessionUser } from "@/types";
import type { WithdrawalRecord } from "@/types/withdrawals";
import { auditInTx } from "./audit";
import { resolveDestination } from "./banks";
import { AppError } from "./errors";
import { db } from "./firebase-admin";
import { loadItem } from "./items";
import { getUserDoc } from "./profile";
import { getPlatformSettings } from "./settings";
import { loadWallet, walletRef } from "./wallet";

const col = () => db().collection("withdrawals");

export function toWithdrawal(id: string, d: DocumentData): WithdrawalRecord {
  const dest = d.destinationAccountSnapshot ?? {};
  return {
    id, itemId: d.itemId, itemName: d.itemNameSnapshot ?? "", ownerAdminId: d.ownerAdminId, requestedBy: d.requestedBy ?? d.ownerAdminId, requesterName: d.requesterName ?? "",
    amountKobo: d.amountKobo, status: d.status, requestedAt: d.requestedAt, processedAt: d.processedAt ?? null, processedBy: d.processedBy ?? null,
    payoutReference: d.providerReference ?? null, note: d.note ?? null, reason: d.reason ?? null,
    destination: { bankCode: dest.bankCode ?? "", bankName: dest.bankName ?? "", accountNumber: dest.accountNumber ?? "", accountName: dest.accountName ?? "" },
  };
}

/**
 * Creates a request and reserves the amount in one transaction, so two requests can never spend the same money.
 * Only the item's current owner can ask. The account name is looked up here, never taken from the browser.
 */
export async function requestWithdrawal(user: SessionUser, input: { itemId: string; bankCode: string; accountNumber: string; amountKobo: number }): Promise<{ id: string }> {
  if (input.amountKobo < MIN_WITHDRAWAL_KOBO) throw new AppError("WITHDRAWAL_BELOW_MINIMUM", { amountKobo: "The minimum withdrawal is ₦100." });
  const item = await loadItem(input.itemId);
  if (item.ownerAdminId !== user.uid) throw new AppError("NOT_ITEM_OWNER");

  const [dest, settings, profile] = await Promise.all([resolveDestination(input.bankCode, input.accountNumber), getPlatformSettings(), getUserDoc(user.uid)]);
  await loadWallet(item.id, settings.withdrawalHoldHours); // releases days that have just passed the hold, so "available" is current

  const ref = col().doc();
  const wRef = walletRef(item.id);
  await db().runTransaction(async (tx) => {
    const [itemSnap, walletSnap, openSnap] = await Promise.all([
      tx.get(db().doc(`items/${item.id}`)), tx.get(wRef),
      tx.get(col().where("itemId", "==", item.id).where("status", "==", "PENDING").limit(MAX_PENDING_PER_ITEM)),
    ]);
    if (itemSnap.data()?.ownerAdminId !== user.uid) throw new AppError("NOT_ITEM_OWNER"); // a transfer may have landed meanwhile
    if (openSnap.size >= MAX_PENDING_PER_ITEM) throw new AppError("TOO_MANY_PENDING_WITHDRAWALS");
    const w = walletSnap.data() ?? {};
    const available = Math.max(0, (w.releasedKobo ?? 0) - (w.withdrawnKobo ?? 0) - (w.reservedKobo ?? 0));
    if (input.amountKobo > available) throw new AppError("INSUFFICIENT_AVAILABLE_BALANCE", { amountKobo: "That is more than the available balance." });

    const now = Date.now();
    tx.set(ref, {
      itemId: item.id, itemNameSnapshot: item.name, ownerAdminId: user.uid, requestedBy: user.uid, requesterName: profile?.fullName ?? "", amountKobo: input.amountKobo, currency: "NGN",
      status: "PENDING", requestedAt: now, processedAt: null, processedBy: null, providerReference: null, note: null, reason: null,
      destinationAccountSnapshot: { bankCode: input.bankCode, bankName: dest.bankName, accountNumber: input.accountNumber, accountName: dest.accountName },
    });
    tx.set(wRef, { reservedKobo: FieldValue.increment(input.amountKobo), updatedAt: now }, { merge: true });
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: "WITHDRAWAL_REQUESTED", resourceType: "withdrawal", resourceId: ref.id, metadata: { itemId: item.id, amountKobo: input.amountKobo } });
  });
  return { id: ref.id };
}

/** Owner withdraws their own open request; the reserved money goes back to available. The platform admin can also cancel. */
export async function cancelWithdrawal(user: SessionUser, id: string): Promise<void> {
  await closeRequest(user, id, "CANCELLED", "Cancelled", (w) => w.requestedBy === user.uid || user.role === "SUPER_ADMIN");
}

/** Platform admin turns a request down. The reason is shown to the requester. */
export async function rejectWithdrawal(user: SessionUser, id: string, reason: string): Promise<void> {
  await closeRequest(user, id, "REJECTED", reason, () => user.role === "SUPER_ADMIN");
}

async function closeRequest(user: SessionUser, id: string, status: "CANCELLED" | "REJECTED", reason: string, allowed: (w: DocumentData) => boolean): Promise<void> {
  await db().runTransaction(async (tx) => {
    const wRef = col().doc(id);
    const w = (await tx.get(wRef)).data();
    if (!w) throw new AppError("NOT_FOUND");
    if (!allowed(w)) throw new AppError("FORBIDDEN");
    if (w.status !== "PENDING") throw new AppError("WITHDRAWAL_NOT_PENDING");
    const now = Date.now();
    tx.update(wRef, { status, reason, processedAt: now, processedBy: user.uid });
    tx.set(walletRef(w.itemId), { reservedKobo: FieldValue.increment(-w.amountKobo), updatedAt: now }, { merge: true });
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: status === "REJECTED" ? "WITHDRAWAL_REJECTED" : "WITHDRAWAL_CANCELLED", resourceType: "withdrawal", resourceId: id, metadata: { itemId: w.itemId, amountKobo: w.amountKobo } });
  });
}

/**
 * Platform admin confirms the money was sent. In the same transaction the amount moves from "requested" to "withdrawn" on the
 * item's wallet (that is the deduction the item's admin sees) and an immutable ledger entry is written.
 */
export async function markWithdrawalPaid(user: SessionUser, id: string, input: { reference?: string; note?: string }): Promise<void> {
  await db().runTransaction(async (tx) => {
    const wRef = col().doc(id);
    const w = (await tx.get(wRef)).data();
    if (!w) throw new AppError("NOT_FOUND");
    if (w.status !== "PENDING") throw new AppError("WITHDRAWAL_NOT_PENDING");
    const now = Date.now();
    tx.update(wRef, { status: "PAID", processedAt: now, processedBy: user.uid, providerReference: input.reference ?? null, note: input.note ?? null });
    tx.set(walletRef(w.itemId), { reservedKobo: FieldValue.increment(-w.amountKobo), withdrawnKobo: FieldValue.increment(w.amountKobo), updatedAt: now }, { merge: true });
    tx.set(db().doc(`financialLedger/${id}_WITHDRAWAL`), {
      provider: "MANUAL", eventType: "WITHDRAWAL", orderId: null, withdrawalId: id, currency: "NGN", status: "CONFIRMED", reference: input.reference ?? id, createdAt: now,
      itemId: w.itemId, ownerAdminId: w.ownerAdminId, amountKobo: w.amountKobo, direction: "DEBIT",
    });
    auditInTx(tx, { actorUid: user.uid, actorRole: user.role, action: "WITHDRAWAL_PAID", resourceType: "withdrawal", resourceId: id, metadata: { itemId: w.itemId, amountKobo: w.amountKobo } });
  });
}

/** An item's latest requests. Never more than 15 documents are read. Needs withdrawals(itemId ASC, requestedAt DESC). */
export async function itemWithdrawals(itemId: string, limit = MAX_WITHDRAWAL_HISTORY): Promise<WithdrawalRecord[]> {
  const snap = await col().where("itemId", "==", itemId).orderBy("requestedAt", "desc").limit(Math.min(limit, MAX_WITHDRAWAL_HISTORY)).get();
  return snap.docs.map((d) => toWithdrawal(d.id, d.data()));
}

/** Full history for the PDF, read in pages of 500 so one huge read never holds memory. */
export async function allItemWithdrawals(itemId: string): Promise<WithdrawalRecord[]> {
  const out: WithdrawalRecord[] = [];
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (out.length < PDF_MAX_WITHDRAWALS) {
    let q = col().where("itemId", "==", itemId).orderBy("requestedAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    out.push(...snap.docs.map((d) => toWithdrawal(d.id, d.data())));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
  return out;
}

/** Platform admin queue: open requests, oldest first. Needs withdrawals(status ASC, requestedAt ASC). */
export async function pendingQueue(): Promise<WithdrawalRecord[]> {
  const snap = await col().where("status", "==", "PENDING").orderBy("requestedAt", "asc").limit(QUEUE_LIMIT).get();
  return snap.docs.map((d) => toWithdrawal(d.id, d.data()));
}

/** The newest requests across the platform (any status). Single-field index, no composite needed. */
export async function latestWithdrawals(limit = MAX_WITHDRAWAL_HISTORY): Promise<WithdrawalRecord[]> {
  const snap = await col().orderBy("requestedAt", "desc").limit(Math.min(limit, MAX_WITHDRAWAL_HISTORY)).get();
  return snap.docs.map((d) => toWithdrawal(d.id, d.data()));
}
