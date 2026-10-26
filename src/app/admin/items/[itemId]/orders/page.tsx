import Link from "next/link";
import { redirect } from "next/navigation";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { requireManageItem } from "@/lib/server/items";
import { ORDERS_PAGE_SIZE, paidOrdersPage, parseOrderCursor } from "@/lib/server/queries";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

/** Orders load one page at a time (newest first); the total comes from a count query, so nothing scales with the number of orders. */
export default async function ItemOrders({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ cursor?: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const item = await requireManageItem(user, (await params).itemId).catch(() => redirect("/forbidden"));
  const cursor = parseOrderCursor((await searchParams).cursor);
  const { rows, total, next } = await paidOrdersPage(item.id, cursor);
  const base = `/admin/items/${item.id}/orders`;
  return (
    <>
      <PageTitle title={item.name} subtitle={`${total} paid order(s)`} /><ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      {rows.length === 0 ? <EmptyState title="No paid orders yet" body="Orders appear after Paystack confirms a payment." /> : (
        <div className="space-y-4">
          <OrdersTable orders={rows} settings={await getPlatformSettings()} batched={item.batchProcessingEnabled} />
          <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
            <span>Showing {rows.length} of {total} · {ORDERS_PAGE_SIZE} per page, newest first</span>
            <span className="flex gap-2">
              {cursor && <Link href={base} className={buttonClass("outline", "sm")}>← Newest</Link>}
              {next && <Link href={`${base}?cursor=${next}`} className={buttonClass("outline", "sm")}>Older →</Link>}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
