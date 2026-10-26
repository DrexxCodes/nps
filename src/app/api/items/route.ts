import { isPurchasable } from "@/lib/item-status";
import { toStudentItem } from "@/lib/pricing";
import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { toItem } from "@/lib/server/items";
import { requireUser } from "@/lib/server/session";
import { currentClassYear } from "@/lib/server/student-class";

/** Public catalog: only currently purchasable items, priced for the caller's class, with owner/staff identifiers and class overrides stripped. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req).catch(() => null);
  const [snap, year] = await Promise.all([db().collection("items").where("status", "in", ["ACTIVE", "SCHEDULED"]).get(), currentClassYear(user?.uid)]);
  const items = snap.docs.map(toItem).filter((i) => isPurchasable(i)).map((i) => toStudentItem(i, year)).map(({ ownerAdminId, assignedStaffIds, ...pub }) => { void ownerAdminId; void assignedStaffIds; return pub; });
  return ok({ items });
});
