import type { Item } from "@/types";

/** Effective purchasability at `now` (server clock). */
export function isPurchasable(item: Pick<Item, "status" | "startAt" | "endAt">, now = Date.now()): boolean {
  if (item.status === "ACTIVE") return !(item.endAt && now > item.endAt) && !(item.startAt && now < item.startAt);
  if (item.status === "SCHEDULED") return !!item.startAt && now >= item.startAt && !(item.endAt && now > item.endAt);
  return false;
}
