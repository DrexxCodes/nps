import { withdrawalRejectSchema } from "@/lib/validation/schemas";
import { ok, route } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/session";
import { rejectWithdrawal } from "@/lib/server/withdrawals";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;
  const { reason } = withdrawalRejectSchema.parse(await req.json());
  await rejectWithdrawal(user, id, reason);
  return ok({});
});
