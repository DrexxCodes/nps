import "server-only";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import type { Item, SessionUser, SubItem } from "@/types";
import { resolveItemStatus } from "@/lib/item-status";
import { audit } from "./audit";
import { db } from "./firebase-admin";
import { AppError } from "./errors";

export function toItem(snap: DocumentSnapshot<DocumentData>): Item {
  const d = snap.data() ?? {};
  return {
    id: snap.id, name: d.name, description: d.description ?? "", coverImageUrl: d.coverImageUrl ?? null, ownerAdminId: d.ownerAdminId,
    status: d.status, startAt: d.startAt ?? null, endAt: d.endAt ?? null, hasSubItems: !!d.hasSubItems, subItems: ((d.subItems ?? []) as SubItem[]).map((s) => ({ ...s, classPrices: s.classPrices ?? [] })),
    basePriceKobo: d.basePriceKobo ?? 0, classPrices: d.classPrices ?? [], variantSets: d.variantSets ?? [], requiredProfileFields: d.requiredProfileFields ?? [], physical: d.physical !== false, batchProcessingEnabled: !!d.batchProcessingEnabled,
    batchSize: d.batchSize ?? 50, batchLimitEnabled: !!d.batchLimitEnabled, maxBatches: d.maxBatches ?? 1, nfcEnabled: !!d.nfcEnabled,
    nfcPayloadFields: d.nfcPayloadFields ?? [], assignedStaffIds: d.assignedStaffIds ?? [], createdAt: d.createdAt ?? 0, updatedAt: d.updatedAt ?? 0,
  };
}

export async function loadItem(itemId: string): Promise<Item> {
  const snap = await db().doc(`items/${itemId}`).get();
  if (!snap.exists) throw new AppError("NOT_FOUND");
  return toItem(snap);
}

/** Several items in ONE batched read. Missing items map to null. */
export async function loadItems(ids: string[]): Promise<Map<string, Item | null>> {
  const unique = [...new Set(ids)];
  const snaps = unique.length ? await db().getAll(...unique.map((id) => db().doc(`items/${id}`))) : [];
  return new Map(unique.map((id, i) => [id, snaps[i]?.exists ? toItem(snaps[i]!) : null]));
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
  return (await syncItemStatuses(snap.docs.map(toItem))).sort((a, b) => b.createdAt - a.createdAt);
}

/** Items this user owns, whatever their role (a Super Admin's own items, not the whole platform). No status sync: used for money views only. */
export async function ownedItems(uid: string): Promise<Item[]> {
  const snap = await db().collection("items").where("ownerAdminId", "==", uid).get();
  return snap.docs.map(toItem).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Brings an item's stored status in line with its schedule (see `resolveItemStatus`) and returns the up-to-date item.
 * Runs when an admin opens the item pages and before a student can see, price or buy an item. The write only happens if the
 * stored status is still the one we read, so a concurrent admin change always wins.
 */
export async function syncItemStatus(item: Item): Promise<Item> {
  const next = resolveItemStatus(item);
  if (next === item.status) return item;
  const ref = db().doc(`items/${item.id}`);
  const applied = await db().runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (!cur.exists || cur.get("status") !== item.status) return false;
    tx.update(ref, { status: next, updatedAt: Date.now() });
    return true;
  });
  if (!applied) return loadItem(item.id);
  await audit({ actorUid: "system", actorRole: "SYSTEM", action: "ITEM_STATUS_AUTO_UPDATED", resourceType: "item", resourceId: item.id, metadata: { from: item.status, to: next } }).catch(() => undefined);
  return { ...item, status: next };
}

export const syncItemStatuses = (items: Item[]): Promise<Item[]> => Promise.all(items.map(syncItemStatus));

/** loadItem + syncItemStatus: for every path where the current status matters. */
export async function loadFreshItem(itemId: string): Promise<Item> {
  return syncItemStatus(await loadItem(itemId));
}
