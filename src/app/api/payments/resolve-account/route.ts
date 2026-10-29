import { bankSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { resolveAccount } from "@/lib/server/providers/paystack";
import { requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`resolve:${user.uid}:${clientIp(req)}`, 15, 60_000);
  const { bankCode, accountNumber } = bankSchema.parse(await req.json());
  const res = await resolveAccount(accountNumber, bankCode);
  if (!res.status) throw new AppError("VALIDATION_ERROR", { accountNumber: "We could not resolve this account. Check the bank and number." });
  return ok({ accountName: res.data.account_name });
});
