import { after } from "next/server";
import { transferOwnershipSchema } from "@/lib/validation/schemas";
import { ok, route } from "@/lib/server/errors";
import { repointOrders, transferOwnership } from "@/lib/server/ownership";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const maxDuration = 60; // re-pointing a large item's orders runs after the response but still counts against the function time

/**
 * The item's owner can hand it to another admin; a Super Admin can move any item without the owner's permission.
 * Authorization is decided on the server from the stored owner (`canManageItem`), never from anything the browser sends.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const { email, reason } = transferOwnershipSchema.parse(await req.json());
  const r = await transferOwnership(user, itemId, email, reason);
  after(() => repointOrders(itemId, r.toUid, r.transferId).catch((e) => console.error("[ownership] re-pointing orders failed", itemId, e instanceof Error ? e.message : "unknown")));
  return ok({ mode: r.mode, cancelledRequests: r.cancelledRequests });
});
