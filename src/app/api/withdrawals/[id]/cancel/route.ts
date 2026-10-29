import { ok, route } from "@/lib/server/errors";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";
import { cancelWithdrawal } from "@/lib/server/withdrawals";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { id } = await ctx.params;
  await cancelWithdrawal(user, id);
  return ok({});
});
