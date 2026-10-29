import { withdrawalPaySchema } from "@/lib/validation/schemas";
import { ok, route } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { markWithdrawalPaid } from "@/lib/server/withdrawals";

/** Platform admin only: confirms the money was sent. Deducts it from the item's wallet in the same transaction. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;
  const input = withdrawalPaySchema.parse(await req.json().catch(() => ({})));
  await markWithdrawalPaid(user, id, input);
  return ok({});
});
