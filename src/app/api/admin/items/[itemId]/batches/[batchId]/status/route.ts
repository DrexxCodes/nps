import { batchStatusSchema } from "@/lib/validation/schemas";
import { changeBatchStatus } from "@/lib/server/batches";
import { ok, route } from "@/lib/server/errors";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string; batchId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId, batchId } = await ctx.params;
  const item = await requireManageItem(user, itemId);
  await changeBatchStatus(user, item, batchId, batchStatusSchema.parse(await req.json()).status);
  return ok({});
});
