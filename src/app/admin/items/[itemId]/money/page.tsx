import { redirect } from "next/navigation";
import { BalanceCards } from "@/components/admin/money/BalanceCards";
import { ExportWithdrawalsButton } from "@/components/admin/money/ExportWithdrawalsButton";
import { WithdrawalHistory } from "@/components/admin/money/WithdrawalHistory";
import { WithdrawalRequestForm } from "@/components/admin/money/WithdrawalRequestForm";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { MAX_WITHDRAWAL_HISTORY } from "@/constants/withdrawals";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { loadWallet } from "@/lib/server/wallet";
import { itemWithdrawals } from "@/lib/server/withdrawals";

export const metadata = { title: "Item money" };
export const dynamic = "force-dynamic";

export default async function ItemMoney({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const { itemId } = await params;
  const item = await requireManageItem(user, itemId).catch(() => redirect("/forbidden"));
  const settings = await getPlatformSettings();
  // Settles any day that has just passed the hold, then reads the wallet (1 doc) and at most 15 requests.
  const [wallet, history] = await Promise.all([loadWallet(item.id, settings.withdrawalHoldHours), itemWithdrawals(item.id)]);
  const isOwner = item.ownerAdminId === user.uid;

  return (
    <>
      <PageTitle title={item.name} subtitle="Money" action={<ExportWithdrawalsButton itemId={item.id} />} />
      <ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      <BalanceCards balances={wallet.balances} nextReleaseAt={wallet.nextReleaseAt} holdHours={settings.withdrawalHoldHours} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div>
          {isOwner
            ? <WithdrawalRequestForm itemId={item.id} availableKobo={wallet.balances.availableKobo} />
            : <Card className="text-sm"><p className="font-semibold">Only the owner can request withdrawals</p><p className="mt-1 text-[var(--muted)]">You are viewing this item as Super Admin. To request money from it, transfer ownership to yourself under Ownership.</p></Card>}
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Withdrawal history</h2>
          {history.length === 0
            ? <EmptyState title="No withdrawals yet" body="Requests for this item, and whether they were paid, are listed here." />
            : <WithdrawalHistory rows={history} canCancel={isOwner || user.role === "SUPER_ADMIN"} />}
          <p className="mt-3 text-xs text-[var(--muted)]">Showing the latest {MAX_WITHDRAWAL_HISTORY}. Export PDF includes every request and every settlement day.</p>
        </div>
      </div>
    </>
  );
}
