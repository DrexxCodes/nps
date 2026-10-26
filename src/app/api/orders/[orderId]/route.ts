import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const user = await requireUser(req);
  const { orderId } = await ctx.params;
  const snap = await db().doc(`orders/${orderId}`).get();
  const o = snap.data();
  if (!o || o.userId !== user.uid) throw new AppError("NOT_FOUND"); // students only ever see their own orders
  return ok({ order: { id: snap.id, ...o } });
});
