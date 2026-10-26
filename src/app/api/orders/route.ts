import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const snap = await db().collection("orders").where("userId", "==", user.uid).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; createdAt: number }).sort((a, b) => b.createdAt - a.createdAt);
  return ok({ orders });
});
