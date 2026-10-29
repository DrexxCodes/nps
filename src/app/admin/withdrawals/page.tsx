import Link from "next/link";
import { BalanceCards } from "@/components/admin/money/BalanceCards";
import { WithdrawalHistory } from "@/components/admin/money/WithdrawalHistory";
import { WithdrawalQueue } from "@/components/admin/money/WithdrawalQueue";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { QUEUE_LIMIT } from "@/constants/withdrawals";
import { formatNaira } from "@/lib/money";
import { balancesOf, sumBalances } from "@/lib/wallet";
import { ownedItems } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { loadWallets } from "@/lib/server/wallet";
import { latestWithdrawals, pendingQueue } from "@/lib/server/withdrawals";

export const metadata = { title: "Money" };
export const dynamic = "force-dynamic";

export default async function Withdrawals() {
  const user = await requirePageUser(ADMIN_ROLES);
  const isSuper = user.role === "SUPER_ADMIN";
  const settings = await getPlatformSettings();
  const [items, queue, latest] = await Promise.all([ownedItems(user.uid), isSuper ? pendingQueue() : Promise.resolve([]), isSuper ? latestWithdrawals() : Promise.resolve([])]);
  const wallets = await loadWallets(items.map((i) => i.id), settings.withdrawalHoldHours); // one batched read, plus a small query only for items with money still held
  const rows = items.map((i) => ({ item: i, b: balancesOf(wallets.get(i.id)!) }));
  const total = sumBalances(rows.map((r) => r.b));

  return (
    <>
      <PageTitle title="Money" subtitle={`Collections are held ${settings.withdrawalHoldHours} h after each day's last payment, then can be requested for withdrawal. The platform admin pays requests manually.`} />

      {isSuper && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold">Requests to pay{queue.length ? ` (${queue.length}${queue.length >= QUEUE_LIMIT ? "+" : ""})` : ""}</h2>
          {queue.length === 0 ? <EmptyState title="No open requests" body="When an admin asks to withdraw, it appears here with the account to pay." /> : <WithdrawalQueue rows={queue} />}
        </section>
      )}

      <h2 className="mb-3 font-display text-lg font-bold">{isSuper ? "Items you own" : "Your items"}</h2>
      {rows.length === 0 ? <EmptyState title="No items yet" body="Money from the items you own is shown here." /> : (
        <>
          <BalanceCards balances={total} />
          <div className="mt-5 grid gap-3">
            {rows.map(({ item, b }) => (
              <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/items/${item.id}/money`} className="font-display text-lg font-bold hover:underline">{item.name}</Link>
                  <p className="text-sm text-[var(--muted)]">Available {formatNaira(b.availableKobo)} · Awaiting release {formatNaira(b.awaitingReleaseKobo)} · Requested {formatNaira(b.requestedKobo)} · Withdrawn {formatNaira(b.withdrawnKobo)}</p>
                </div>
                <Link href={`/admin/items/${item.id}/money`} className={buttonClass("outline", "sm")}>Open</Link>
              </Card>
            ))}
          </div>
        </>
      )}

      {isSuper && latest.some((w) => w.status !== "PENDING") && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold">Recently handled</h2>
          <WithdrawalHistory rows={latest.filter((w) => w.status !== "PENDING")} showItem />
        </section>
      )}
    </>
  );
}
