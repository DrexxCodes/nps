import { z } from "zod";
import { audit } from "@/lib/server/audit";
import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const { suspend, reason } = z.object({ suspend: z.boolean(), reason: z.string().trim().min(3).max(200) }).parse(await req.json());
  await requireManageItem(user, itemId);
  await db().doc(`items/${itemId}`).update(suspend ? { status: "SUSPENDED", suspendedAt: Date.now(), suspendedBy: user.uid, updatedAt: Date.now() } : { status: "PAUSED", suspendedAt: null, suspendedBy: null, updatedAt: Date.now() });
  await audit({ actorUid: user.uid, actorRole: user.role, action: suspend ? "ITEM_SUSPENDED" : "ITEM_UNSUSPENDED", resourceType: "item", resourceId: itemId, reason });
  return ok({});
});
