import "server-only";
import { balancesOf, sumBalances } from "@/lib/wallet";
import type { WalletBalances } from "@/types/withdrawals";
import { loadWallets } from "./wallet";

/**
 * Money totals for a set of items (the admin's own items). Read from the per-item wallets, which are updated in the same
 * transaction as every payment and withdrawal, so one document read per item replaces the old scan of every ledger entry.
 * `financialLedger` entries are still written for every payment and payout as the immutable audit trail.
 */
export async function balanceForItems(itemIds: string[], holdHours: number): Promise<WalletBalances> {
  const wallets = await loadWallets(itemIds, holdHours);
  return sumBalances([...wallets.values()].map(balancesOf));
}
