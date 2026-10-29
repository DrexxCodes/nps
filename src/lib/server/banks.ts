import "server-only";
import { AppError } from "./errors";
import { listBanks, resolveAccount } from "./providers/paystack";

export interface Bank { name: string; code: string }

/** The bank list almost never changes: keep it per server instance for 6 hours instead of calling the provider on every form open. */
const TTL_MS = 6 * 3_600_000;
let cache: { at: number; banks: Bank[] } | null = null;

/** Paystack lists some banks more than once under the same code (e.g. 057, 50572), which breaks React keys and the <select>. The code is what we resolve accounts by, so keep the first entry per code. */
export function dedupeBanks(list: { name: string; code: string }[]): Bank[] {
  const seen = new Map<string, Bank>();
  for (const b of list) {
    const code = String(b.code ?? "").trim();
    if (code && !seen.has(code)) seen.set(code, { name: b.name, code });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBanks(): Promise<Bank[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.banks;
  const res = await listBanks();
  const banks = dedupeBanks(res.data ?? []);
  if (banks.length) cache = { at: Date.now(), banks };
  return banks;
}

/** Looks the account up with the bank's own records. Throws a field error the form can show; never returns a client-supplied name. */
export async function resolveDestination(bankCode: string, accountNumber: string): Promise<{ bankName: string; accountName: string }> {
  try {
    const [banks, res] = await Promise.all([getBanks(), resolveAccount(accountNumber, bankCode)]);
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank || !res.status) throw new AppError("VALIDATION_ERROR", { accountNumber: "We could not resolve this account. Check the bank and number." });
    return { bankName: bank.name, accountName: res.data.account_name };
  } catch (e) {
    if (e instanceof AppError && e.code === "PROVIDER_NOT_CONFIGURED") throw new AppError("VALIDATION_ERROR", { accountNumber: "Account lookup is unavailable right now. Ask the platform admin to check the payment provider keys." });
    throw e;
  }
}
