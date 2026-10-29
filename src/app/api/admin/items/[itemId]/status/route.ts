import { z } from "zod";
import { ITEM_STATUSES } from "@/constants";
import { resolveItemStatus } from "@/lib/item-status";
import { audit } from "@/lib/server/audit";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem, syncItemStatus } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

/** Quick status change. SUSPENDED is not available here: suspending and restoring go through /suspend, which needs a reason. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const { status } = z.object({ status: z.enum(ITEM_STATUSES).exclude(["SUSPENDED"]) }).parse(await req.json());
  const item = await syncItemStatus(await requireManageItem(user, itemId));
  if (item.status === "SUSPENDED") throw new AppError("VALIDATION_ERROR", { status: "This item is suspended. Restore it first." });
  if ((status === "ACTIVE" || status === "SCHEDULED") && resolveItemStatus({ status, startAt: item.startAt, endAt: item.endAt }) === "ENDED") {
    throw new AppError("VALIDATION_ERROR", { status: "The closing time has passed. Move the closing time in Details first." });
  }
  if (status === "SCHEDULED" && !item.startAt) throw new AppError("VALIDATION_ERROR", { status: "Set an opening time in Details before scheduling." });
  if (status !== item.status) {
    await db().doc(`items/${itemId}`).update({ status, updatedAt: Date.now() });
    await audit({ actorUid: user.uid, actorRole: user.role, action: "ITEM_STATUS_CHANGED", resourceType: "item", resourceId: itemId, metadata: { from: item.status, to: status } });
  }
  return ok({ status });
});
