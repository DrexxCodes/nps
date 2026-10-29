import type { WITHDRAWAL_STATUSES } from "@/constants/withdrawals";

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

/** The account the money is paid to. Name and bank are resolved on the server, never taken from the browser. */
export interface DestinationAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/** One withdrawal request, as stored in `withdrawals/{id}` (plain values only, safe to pass to client components). */
export interface WithdrawalRecord {
  id: string;
  itemId: string;
  itemName: string;
  /** Owner of the item when the request was made (this is who gets paid). */
  ownerAdminId: string;
  requestedBy: string;
  requesterName: string;
  amountKobo: number;
  status: WithdrawalStatus;
  requestedAt: number;
  processedAt: number | null;
  processedBy: string | null;
  /** Bank transfer reference the platform admin entered when marking it paid. */
  payoutReference: string | null;
  note: string | null;
  /** Why it was rejected or cancelled. */
  reason: string | null;
  destination: DestinationAccount;
}

/** Running totals for one item. All kobo. `release`/`withdraw`/`reserve` are tracked, everything else is derived (see lib/wallet.ts). */
export interface WalletCounters {
  grossKobo: number;
  releasedKobo: number;
  withdrawnKobo: number;
  reservedKobo: number;
  paidOrders: number;
  deliveredOrders: number;
  noCollectionOrders: number;
}

export interface WalletBalances {
  /** Everything collected for the item (item subtotals, platform fee excluded). */
  collectedKobo: number;
  /** Collected but still inside the hold period. */
  awaitingReleaseKobo: number;
  /** Released, not withdrawn and not already requested: what can be requested right now. */
  availableKobo: number;
  /** Tied up in open requests. */
  requestedKobo: number;
  withdrawnKobo: number;
}

/** One settlement day (payments grouped by day in the school's timezone). */
export interface SettlementDay {
  day: string;
  amountKobo: number;
  count: number;
  lastPaidAt: number;
  released: boolean;
}
