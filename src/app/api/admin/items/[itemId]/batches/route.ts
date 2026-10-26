import { ok, route } from "@/lib/server/errors";
import { listBatches } from "@/lib/server/batches";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  await requireManageItem(user, itemId);
  return ok({ batches: await listBatches(itemId) });
});
