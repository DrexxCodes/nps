import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { MAX_PENDING_PER_ITEM } from "@/constants/withdrawals";
import { isAccountBlocked, resolveRole } from "@/lib/roles";
import { normalizeCounters } from "@/lib/wallet";
import type { SessionUser } from "@/types";
import { auditInTx } from "./audit";
import { AppError } from "./errors";
import { db } from "./firebase-admin";
import { canManageItem, loadItem } from "./items";
import { getUserDoc } from "./profile";
import { salesStatsPaths } from "./stats";
import { findUserByEmail } from "./user-lookup";
import { walletRef } from "./wallet";

export interface TransferResult { transferId: string; fromUid: string; toUid: string; mode: "OWNER" | "SUPER_ADMIN"; cancelledRequests: number }

/**
 * Moves an item to another admin.
 *  - The current owner can hand it over.
 *  - A Super Admin can move any item without the owner's permission (mode SUPER_ADMIN, recorded as such).
 * The money follows the item automatically: wallets are per item and the new owner reads the same wallet. Open withdrawal
 * requests were made to the old owner's account, so they are cancelled (and their reserved money released) in the same
 * transaction instead of being paid to someone who no longer owns the item.
 */
export async function transferOwnership(actor: SessionUser, itemId: string, toEmail: string, reason?: string): Promise<TransferResult> {
  const item = await loadItem(itemId);
  if (!canManageItem(actor, item)) throw new AppError("FORBIDDEN");

  const target = await findUserByEmail(toEmail);
  if (!target) throw new AppError("NOT_FOUND", { email: "No account found with that email" });
  const targetRole = resolveRole(target.data);
  if (isAccountBlocked(target.data) || (targetRole !== "ADMIN" && targetRole !== "SUPER_ADMIN")) throw new AppError("TRANSFER_TARGET_INVALID", { email: "That account is not an active Admin." });
  if (target.uid === item.ownerAdminId) throw new AppError("TRANSFER_SAME_OWNER", { email: "That admin already owns this item." });

  const fromProfile = await getUserDoc(item.ownerAdminId);
  const transferRef = db().collection(`items/${itemId}/ownershipTransfers`).doc();
  const withdrawals = db().collection("withdrawals");

  const result = await db().runTransaction(async (tx) => {
    const itemRef = db().doc(`items/${itemId}`);
    const [itemSnap, walletSnap, openSnap] = await Promise.all([
      tx.get(itemRef), tx.get(walletRef(itemId)),
      tx.get(withdrawals.where("itemId", "==", itemId).where("status", "==", "PENDING").limit(MAX_PENDING_PER_ITEM + 1)),
    ]);
    const currentOwner = itemSnap.data()?.ownerAdminId as string | undefined;
    if (!currentOwner || currentOwner !== item.ownerAdminId) throw new AppError("OWNERSHIP_CHANGED");
    if (!canManageItem(actor, { ownerAdminId: currentOwner })) throw new AppError("FORBIDDEN");

    const now = Date.now();
    const mode: "OWNER" | "SUPER_ADMIN" = actor.uid === currentOwner ? "OWNER" : "SUPER_ADMIN";
    let released = 0;
    for (const d of openSnap.docs) {
      released += d.data().amountKobo as number;
      tx.update(d.ref, { status: "CANCELLED", reason: "Ownership of the item was transferred", processedAt: now, processedBy: actor.uid });
    }
    if (released > 0) tx.set(walletRef(itemId), { reservedKobo: FieldValue.increment(-released), updatedAt: now }, { merge: true });

    // Sales totals follow the item: take this item's share off the old owner's counters and add it to the new owner's.
    const c = normalizeCounters(walletSnap.data());
    const [fromStats] = salesStatsPaths(currentOwner);
    const [toStats] = salesStatsPaths(target.uid);
    const inc = (n: number, sign: 1 | -1) => FieldValue.increment(n === 0 ? 0 : sign * n);
    const move = (sign: 1 | -1) => ({ paidOrders: inc(c.paidOrders, sign), grossKobo: inc(c.grossKobo, sign), deliveredOrders: inc(c.deliveredOrders, sign), noCollectionOrders: inc(c.noCollectionOrders, sign), updatedAt: now });
    if (c.paidOrders > 0 || c.grossKobo > 0) { tx.set(db().doc(fromStats!), move(-1), { merge: true }); tx.set(db().doc(toStats!), move(1), { merge: true }); }

    tx.update(itemRef, { ownerAdminId: target.uid, updatedAt: now });
    tx.set(transferRef, {
      itemId, fromUid: currentOwner, fromName: fromProfile?.fullName ?? "", toUid: target.uid, toName: String(target.data.fullName ?? ""), byUid: actor.uid, byRole: actor.role,
      mode, reason: reason ?? null, cancelledRequests: openSnap.size, createdAt: now, ordersSynced: false,
    });
    auditInTx(tx, { actorUid: actor.uid, actorRole: actor.role, action: "ITEM_OWNERSHIP_TRANSFERRED", resourceType: "item", resourceId: itemId, reason, metadata: { from: currentOwner, to: target.uid, mode, cancelledRequests: openSnap.size } });
    return { transferId: transferRef.id, fromUid: currentOwner, toUid: target.uid, mode, cancelledRequests: openSnap.size };
  });
  return result;
}

/**
 * Orders carry `itemOwnerId` (used by the owner's recent-sales list and the stats fallback). Re-point them to the new owner.
 * Runs after the response (`after()`), reads only that one field, skips orders already correct, and is safe to run again.
 */
export async function repointOrders(itemId: string, toUid: string, transferId: string): Promise<void> {
  const snap = await db().collection("orders").where("itemId", "==", itemId).select("itemOwnerId").get();
  const writer = db().bulkWriter();
  for (const d of snap.docs) if (d.data().itemOwnerId !== toUid) writer.update(d.ref, { itemOwnerId: toUid });
  await writer.close();
  await db().doc(`items/${itemId}/ownershipTransfers/${transferId}`).update({ ordersSynced: true });
}
