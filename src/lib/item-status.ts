import type { Item } from "@/types";

/** Effective purchasability at `now` (server clock). */
export function isPurchasable(item: Pick<Item, "status" | "startAt" | "endAt">, now = Date.now()): boolean {
  if (item.status === "ACTIVE") return !(item.endAt && now > item.endAt) && !(item.startAt && now < item.startAt);
  if (item.status === "SCHEDULED") return !!item.startAt && now >= item.startAt && !(item.endAt && now > item.endAt);
  return false;
}

/**
 * The status an item should carry at `now`. Stored statuses only change when someone saves, so schedule dates are applied here:
 * a SCHEDULED item whose opening time has passed is ACTIVE, and an ACTIVE/SCHEDULED item past its closing time is ENDED.
 * Every other status (DRAFT, PAUSED, SUSPENDED, ENDED, ARCHIVED) is a manual decision and is never changed.
 */
export function resolveItemStatus(item: Pick<Item, "status" | "startAt" | "endAt">, now = Date.now()): Item["status"] {
  if (item.status !== "ACTIVE" && item.status !== "SCHEDULED") return item.status;
  if (item.endAt && now > item.endAt) return "ENDED";
  if (item.status === "SCHEDULED" && item.startAt && now >= item.startAt) return "ACTIVE";
  return item.status;
}

export const ITEM_STATUS_LABEL: Record<Item["status"], string> = { DRAFT: "Draft", SCHEDULED: "Scheduled", ACTIVE: "Active", PAUSED: "Paused", ENDED: "Ended", SUSPENDED: "Suspended", ARCHIVED: "Archived" };
export const ITEM_STATUS_TONE: Record<Item["status"], "green" | "amber" | "red" | "gray" | "blue"> = { DRAFT: "gray", SCHEDULED: "blue", ACTIVE: "green", PAUSED: "amber", ENDED: "gray", SUSPENDED: "red", ARCHIVED: "gray" };

/** Why students can or cannot buy right now, in words an admin can act on. */
export function purchaseNote(item: Pick<Item, "status" | "startAt" | "endAt">, now = Date.now()): string {
  if (isPurchasable(item, now)) return "Students can buy this item now.";
  if (item.status === "ACTIVE" || item.status === "SCHEDULED") {
    if (item.endAt && now > item.endAt) return "Not open: the closing time has passed.";
    if (item.startAt && now < item.startAt) return `Not open yet: opens ${new Date(item.startAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.`;
    return "Not open: a scheduled item needs an opening time.";
  }
  return `Not open: the item is ${ITEM_STATUS_LABEL[item.status].toLowerCase()}.`;
}
