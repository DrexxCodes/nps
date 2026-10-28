import { ok, route } from "@/lib/server/errors";
import { trackedOrdersForUser } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** The caller's own orders with live batch status. The orders screens poll this, so admin batch changes reach students without a refresh. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return ok({ orders: await trackedOrdersForUser(user.uid) }, 200);
});
