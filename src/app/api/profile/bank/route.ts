import { bankSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { listBanks, resolveAccount } from "@/lib/server/providers/paystack";
import { requireUser } from "@/lib/server/session";

/** Re-resolves server-side so the stored account name is never client-supplied. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { bankCode, accountNumber } = bankSchema.parse(await req.json());
  const [banks, resolved] = await Promise.all([listBanks(), resolveAccount(accountNumber, bankCode)]);
  const bank = banks.data?.find((b) => b.code === bankCode);
  if (!bank || !resolved.status) throw new AppError("VALIDATION_ERROR", { accountNumber: "We could not resolve this account. Check the bank and number." });
  await db().doc(`users/${user.uid}`).update({ bankDetails: { bankCode, bankName: bank.name, accountNumber, accountName: resolved.data.account_name }, updatedAt: Date.now() });
  return ok({ accountName: resolved.data.account_name, bankName: bank.name });
});
