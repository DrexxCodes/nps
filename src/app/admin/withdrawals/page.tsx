import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { balanceFor } from "@/lib/server/ledger";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Money" };
export const dynamic = "force-dynamic";

export default async function Withdrawals() {
  const user = await requirePageUser(ADMIN_ROLES);
  const b = await balanceFor(user.uid);
  const rows: [string, number][] = [["Gross collections", b.grossKobo], ["Withdrawn", b.withdrawnKobo], ["Reserved for pending transfers", b.pendingKobo], ["Available balance", b.availableKobo]];
  return (
    <>
      <PageTitle title="Money" subtitle="Balances are computed from immutable ledger entries." />
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">{rows.map(([l, v]) => <Card key={l}><p className="text-sm text-[var(--muted)]">{l}</p><p className="mt-1 font-display text-2xl font-bold">{formatNaira(v)}</p></Card>)}</div>
      <Card className="mt-5 max-w-3xl text-sm"><p className="font-semibold">Withdrawals are not enabled yet.</p><p className="mt-1 text-[var(--muted)]">Transfers will be switched on after the payment provider's transfer and settlement setup for this account is verified, so no payout is ever shown as done when it isn't. <Link className="text-[var(--accent)] hover:underline" href="/admin/withdrawals/history">View withdrawal history</Link></p></Card>
    </>
  );
}
