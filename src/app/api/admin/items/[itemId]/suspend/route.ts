import { z } from "zod";
import { audit } from "@/lib/server/audit";
import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { resolveItemStatus } from "@/lib/item-status";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const { suspend, reason } = z.object({ suspend: z.boolean(), reason: z.string().trim().min(3).max(200) }).parse(await req.json());
  const item = await requireManageItem(user, itemId);
  // A restored item goes straight back to ACTIVE. If its closing time passed while it was suspended it comes back ENDED instead,
  // so restoring can never open an item the schedule has already closed.
  const restored = resolveItemStatus({ status: "ACTIVE", startAt: item.startAt, endAt: item.endAt });
  await db().doc(`items/${itemId}`).update(suspend ? { status: "SUSPENDED", suspendedAt: Date.now(), suspendedBy: user.uid, updatedAt: Date.now() } : { status: restored, suspendedAt: null, suspendedBy: null, updatedAt: Date.now() });
  await audit({ actorUid: user.uid, actorRole: user.role, action: suspend ? "ITEM_SUSPENDED" : "ITEM_UNSUSPENDED", resourceType: "item", resourceId: itemId, reason, metadata: { from: item.status, to: suspend ? "SUSPENDED" : restored } });
  return ok({ status: suspend ? "SUSPENDED" : restored });
});
