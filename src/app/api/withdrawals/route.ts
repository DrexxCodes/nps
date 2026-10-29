import { withdrawalRequestSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { canManageItem, loadItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { itemWithdrawals, requestWithdrawal } from "@/lib/server/withdrawals";
import { loadWallet } from "@/lib/server/wallet";

/** One item's balances and its latest 15 requests. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) throw new AppError("VALIDATION_ERROR", { itemId: "itemId is required" });
  const item = await loadItem(itemId);
  if (!canManageItem(user, item)) throw new AppError("FORBIDDEN");
  const settings = await getPlatformSettings();
  const [wallet, history] = await Promise.all([loadWallet(itemId, settings.withdrawalHoldHours), itemWithdrawals(itemId)]);
  return ok({ balances: wallet.balances, nextReleaseAt: wallet.nextReleaseAt, holdHours: settings.withdrawalHoldHours, history });
});

/** Creates a request (the platform admin still has to approve and pay it by hand). Owner of the item only. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req, ADMIN_ROLES);
  rateLimit(`withdraw:${user.uid}:${clientIp(req)}`, 10, 60_000);
  const input = withdrawalRequestSchema.parse(await req.json());
  const { id } = await requestWithdrawal(user, input);
  return ok({ id }, 201);
});
