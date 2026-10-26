import { ShoppingBag } from "lucide-react";
import { VerifyOnReturn } from "@/components/student/VerifyOnReturn";
import { FulfillmentBadge, PaymentBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { describeVariants } from "@/lib/variants";
import { batchStatus, ordersForUser } from "@/lib/server/queries";
import { requirePageUser } from "@/lib/server/session";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const user = await requirePageUser(["STUDENT"]);
  const { reference } = await searchParams;
  const orders = await ordersForUser(user.uid);
  const statuses = await Promise.all(orders.map((o) => batchStatus(o.itemId, o.batchId)));
  return (
    <>
      <PageTitle title="My orders" subtitle="Track each order from payment to pickup." />
      {reference && /^NAPSS-NAU-\d+-[A-Z]+$/.test(reference) && <VerifyOnReturn reference={reference} />}
      {orders.length === 0 ? <EmptyState icon={<ShoppingBag className="size-6" />} title="No orders yet" body="Orders appear here as soon as a payment is confirmed." /> : (
        <div className="space-y-3">{orders.map((o, i) => (
          <Card key={o.id} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-display text-lg font-bold">{o.itemNameSnapshot}</h3><p className="text-xs text-[var(--muted)]">Ref {o.reference} · {new Date(o.paidAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p></div><b>{formatNaira(o.totalAmount)}</b></div>
            {(o.selectedSubItems?.length ?? 0) > 0 && <p className="text-sm text-[var(--muted)]">{o.selectedSubItems.map((s: { name: string }) => s.name).join(", ")}</p>}
            {(o.selectedVariants?.length ?? 0) > 0 && <p className="text-sm text-[var(--muted)]">{describeVariants(o.selectedVariants)}</p>}
            <div className="flex flex-wrap items-center gap-2"><PaymentBadge status={o.paymentStatus} /><FulfillmentBadge fulfillment={o.fulfillmentStatus} batchStatus={statuses[i]} batched={!!o.batchId} />{o.batchNumber && <span className="text-xs text-[var(--muted)]">Batch {o.batchNumber}</span>}{o.batchPending && <span className="text-xs text-[var(--warn)]">Batch assignment pending</span>}</div>
            {o.deliveredAt && <p className="text-xs text-[var(--muted)]">Delivered {new Date(o.deliveredAt).toLocaleString("en-NG")}</p>}
          </Card>))}</div>
      )}
    </>
  );
}
