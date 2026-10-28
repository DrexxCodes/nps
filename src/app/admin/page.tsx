import Link from "next/link";
import { FulfillmentBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { db } from "@/lib/server/firebase-admin";
import { itemsForUser } from "@/lib/server/items";
import { balanceFor } from "@/lib/server/ledger";
import { batchStatusFor, recentSales } from "@/lib/server/queries";
import { requirePageUser, ADMIN_ROLES } from "@/lib/server/session";
import { getSalesStats } from "@/lib/server/stats";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await requirePageUser(ADMIN_ROLES);
  const owner = user.role === "SUPER_ADMIN" ? null : user.uid; // null = platform-wide
  // Totals come from running counters updated by the payment transaction, and recent sales are a 5-row query: no order scan.
  const [items, stats, recent, bal] = await Promise.all([itemsForUser(user), getSalesStats(owner), recentSales(owner, 5), balanceFor(user.uid)]);
  const awaiting = Math.max(0, stats.paidOrders - stats.deliveredOrders - stats.noCollectionOrders); // orders with nothing to collect never await pickup
  const batchStates = { QUEUED: 0, PROCESSING: 0, READY_FOR_PICKUP: 0 };
  const batchSnaps = await Promise.all(items.filter((x) => x.batchProcessingEnabled).map((i) => db().collection(`items/${i.id}/batches`).get()));
  for (const snap of batchSnaps) for (const b of snap.docs) batchStates[b.data().status as keyof typeof batchStates]++;

  const studentIds = [...new Set(recent.map((o) => o.userId as string))];
  const studentSnaps = studentIds.length ? await db().getAll(...studentIds.map((id) => db().doc(`users/${id}`))) : [];
  const names = new Map(studentSnaps.map((s) => [s.id, (s.data()?.fullName as string | undefined) ?? "Unknown"]));
  const orderBatchStatus = await batchStatusFor(recent); // at most 5 batch reads
  const batchedItems = new Set(items.filter((i) => i.batchProcessingEnabled).map((i) => i.id));

  const stat = (label: string, value: string | number, note?: string) => <Card key={label}><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p>{note && <p className="mt-1 text-xs text-[var(--muted)]">{note}</p>}</Card>;
  return (
    <>
      <PageTitle title="Overview" subtitle={user.role === "SUPER_ADMIN" ? "Platform-wide activity" : "Activity on your items"} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Items", items.length, `${items.filter((i) => i.status === "ACTIVE").length} active`)}
        {stat("Paid orders", stats.paidOrders)}
        {stat("Gross collections", formatNaira(stats.grossKobo), "Item subtotals, confirmed payments only")}
        {stat("Available balance", formatNaira(bal.availableKobo), "From the ledger, after withdrawals")}
        {stat("Awaiting fulfillment", awaiting)}
        {stat("Delivered", stats.deliveredOrders, stats.noCollectionOrders > 0 ? `${stats.noCollectionOrders} paid order(s) need no collection` : undefined)}
        {stat("Batches queued / processing", `${batchStates.QUEUED} / ${batchStates.PROCESSING}`)}
        {stat("Ready for pickup", batchStates.READY_FOR_PICKUP, "batches")}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Recent sales</h2>
      {recent.length === 0 ? <EmptyState title="No sales yet" body="The five newest paid orders show up here." /> : (
        <Card className="divide-y divide-[var(--line)] p-0">
          {recent.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{names.get(o.userId) ?? "Unknown"}</p>
                <p className="truncate text-sm text-[var(--muted)]">{o.itemNameSnapshot} · {new Date(o.paidAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="flex items-center gap-3">
                <FulfillmentBadge fulfillment={o.fulfillmentStatus} batchStatus={o.batchId ? orderBatchStatus.get(`${o.itemId}/${o.batchId}`) : null} batched={batchedItems.has(o.itemId) && !!o.batchId} />
                <span className="font-semibold">{formatNaira(o.subtotal)}</span>
              </div>
            </div>
          ))}
          <div className="px-5 py-3 text-right text-sm"><Link href="/admin/items" className="font-medium text-[var(--accent)] hover:underline">All items and orders →</Link></div>
        </Card>
      )}
    </>
  );
}
