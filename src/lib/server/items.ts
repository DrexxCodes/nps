import "server-only";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import type { Item, SessionUser, SubItem } from "@/types";
import { db } from "./firebase-admin";
import { AppError } from "./errors";

export function toItem(snap: DocumentSnapshot<DocumentData>): Item {
  const d = snap.data() ?? {};
  return {
    id: snap.id, name: d.name, description: d.description ?? "", coverImageUrl: d.coverImageUrl ?? null, ownerAdminId: d.ownerAdminId,
    status: d.status, startAt: d.startAt ?? null, endAt: d.endAt ?? null, hasSubItems: !!d.hasSubItems, subItems: ((d.subItems ?? []) as SubItem[]).map((s) => ({ ...s, classPrices: s.classPrices ?? [] })),
    basePriceKobo: d.basePriceKobo ?? 0, classPrices: d.classPrices ?? [], variantSets: d.variantSets ?? [], requiredProfileFields: d.requiredProfileFields ?? [], batchProcessingEnabled: !!d.batchProcessingEnabled,
    batchSize: d.batchSize ?? 50, batchLimitEnabled: !!d.batchLimitEnabled, maxBatches: d.maxBatches ?? 1, nfcEnabled: !!d.nfcEnabled,
    nfcPayloadFields: d.nfcPayloadFields ?? [], assignedStaffIds: d.assignedStaffIds ?? [], createdAt: d.createdAt ?? 0, updatedAt: d.updatedAt ?? 0,
  };
}

export async function loadItem(itemId: string): Promise<Item> {
  const snap = await db().doc(`items/${itemId}`).get();
  if (!snap.exists) throw new AppError("NOT_FOUND");
  return toItem(snap);
}

/** Super Admin: any item. Admin: own items. */
export const canManageItem = (user: SessionUser, item: Pick<Item, "ownerAdminId">): boolean =>
  user.role === "SUPER_ADMIN" || (user.role === "ADMIN" && item.ownerAdminId === user.uid);

/** Manage rights, or an explicit staff assignment. */
export const canOperateItem = (user: SessionUser, item: Pick<Item, "ownerAdminId" | "assignedStaffIds">): boolean =>
  canManageItem(user, item) || (user.role === "STAFF" && item.assignedStaffIds.includes(user.uid));

export async function requireManageItem(user: SessionUser, itemId: string): Promise<Item> {
  const item = await loadItem(itemId);
  if (!canManageItem(user, item)) throw new AppError("FORBIDDEN");
  return item;
}

export async function itemsForUser(user: SessionUser): Promise<Item[]> {
  const col = db().collection("items");
  const q = user.role === "SUPER_ADMIN" ? col : user.role === "ADMIN" ? col.where("ownerAdminId", "==", user.uid) : col.where("assignedStaffIds", "array-contains", user.uid);
  const snap = await q.get();
  return snap.docs.map(toItem).sort((a, b) => b.createdAt - a.createdAt);
}
