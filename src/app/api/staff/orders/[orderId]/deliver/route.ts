import { z } from "zod";
import { deliverOrder } from "@/lib/server/batches";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { canOperateItem, loadItem } from "@/lib/server/items";
import { OPS_ROLES, requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const user = await requireUser(req, OPS_ROLES);
  const { orderId } = await ctx.params;
  z.object({ confirm: z.literal(true) }).parse(await req.json()); // explicit confirmation required
  const order = (await db().doc(`orders/${orderId}`).get()).data();
  if (!order) throw new AppError("NOT_FOUND");
  const item = await loadItem(order.itemId);
  if (!canOperateItem(user, item)) throw new AppError("FORBIDDEN");
  await deliverOrder(user, item, orderId);
  return ok({});
});
