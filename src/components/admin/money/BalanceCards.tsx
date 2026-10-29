import { Card } from "@/components/ui/Card";
import { formatNaira } from "@/lib/money";
import { formatWait, formatWhen } from "@/lib/wallet";
import type { WalletBalances } from "@/types/withdrawals";

/** The five numbers an admin needs. `nextReleaseAt` (when the next held day opens up) is only passed for a single item. */
export function BalanceCards({ balances: b, nextReleaseAt, holdHours }: { balances: WalletBalances; nextReleaseAt?: number | null; holdHours?: number }) {
  const cards: { label: string; value: number; note?: string; strong?: boolean }[] = [
    { label: "Available to withdraw", value: b.availableKobo, strong: true, note: "Released and not yet requested" },
    { label: "Awaiting release", value: b.awaitingReleaseKobo, note: nextReleaseAt ? `Next day opens in ${formatWait(nextReleaseAt - Date.now())} (${formatWhen(nextReleaseAt)})` : holdHours !== undefined ? `Held ${holdHours} h after each day's last payment` : undefined },
    { label: "Requested", value: b.requestedKobo, note: "Waiting for the platform admin" },
    { label: "Withdrawn", value: b.withdrawnKobo, note: "Paid out" },
    { label: "Collected", value: b.collectedKobo, note: "Item subtotals, confirmed payments" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className={c.strong ? "ring-1 ring-[var(--accent)]" : ""}>
          <p className="text-sm text-[var(--muted)]">{c.label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatNaira(c.value)}</p>
          {c.note && <p className="mt-1 text-xs text-[var(--muted)]">{c.note}</p>}
        </Card>
      ))}
    </div>
  );
}
