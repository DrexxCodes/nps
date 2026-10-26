import { Receipt } from "lucide-react";
import { PaymentBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { transactionsForUser } from "@/lib/server/queries";
import { requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Payment history" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await requirePageUser(["STUDENT"]);
  const txns = await transactionsForUser(user.uid);
  return (
    <>
      <PageTitle title="Payment history" subtitle="Every attempt, with the time of each status change." />
      {txns.length === 0 ? <EmptyState icon={<Receipt className="size-6" />} title="No payments yet" body="Your receipts will be listed here." /> : (
        <div className="space-y-3">{txns.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{t.itemNameSnapshot}</p><p className="text-xs text-[var(--muted)]">{t.reference}</p></div><div className="flex items-center gap-3"><b>{formatNaira(t.amountKobo)}</b><PaymentBadge status={t.status} /></div></div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-[var(--muted)] sm:grid-cols-2">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(t.subtotalKobo)}</dd></div>
              <div className="flex justify-between"><dt>Platform fee</dt><dd>{formatNaira(t.platformFeeKobo)}</dd></div>
            </dl>
            <ol className="mt-3 space-y-0.5 border-t border-[var(--line)] pt-2 text-xs text-[var(--muted)]">{(t.statusHistory as { status: string; at: number }[]).map((h, i) => <li key={i}>{h.status.charAt(0) + h.status.slice(1).toLowerCase()} · {new Date(h.at).toLocaleString("en-NG")}</li>)}</ol>
          </Card>))}</div>
      )}
    </>
  );
}
