/** Withdrawals, settlement hold and ownership transfer. Kept apart from constants/index.ts so the money rules live in one place. */
export const WITHDRAWAL_STATUSES = ["PENDING", "PAID", "REJECTED", "CANCELLED"] as const;
export const WITHDRAWAL_STATUS_LABEL: Record<(typeof WITHDRAWAL_STATUSES)[number], string> = { PENDING: "Pending approval", PAID: "Paid", REJECTED: "Rejected", CANCELLED: "Cancelled" };

/** Providers settle the next day, so 24 hours is the default hold. 0 = no hold. */
export const DEFAULT_HOLD_HOURS = 24;
export const MAX_HOLD_HOURS = 720;

/** Payments are grouped into settlement days in this zone (Africa/Lagos has no DST). */
export const SETTLEMENT_TIMEZONE = "Africa/Lagos";

export const MIN_WITHDRAWAL_KOBO = 10_000; // ₦100
/** An item's withdrawal history screen never fetches more than this. The PDF export has no such limit. */
export const MAX_WITHDRAWAL_HISTORY = 15;
/** Open requests per item. Also bounds the work a single ownership transfer has to do. */
export const MAX_PENDING_PER_ITEM = 3;
/** How many open requests the platform admin's queue loads at once (oldest first). */
export const QUEUE_LIMIT = 30;
export const PDF_MAX_WITHDRAWALS = 5000;
/** Settlement days released per query round. */
export const SETTLE_BATCH = 100;
