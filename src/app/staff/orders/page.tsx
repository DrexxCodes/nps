import { OrdersTable } from "@/components/admin/OrdersTable";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { itemsForUser } from "@/lib/server/items";
import { recentPaidOrdersForItems } from "@/lib/server/queries";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function StaffOrders() {
  const items = await itemsForUser(await requirePageUser(OPS_ROLES));
  const orders = items.length ? await recentPaidOrdersForItems(items.map((i) => i.id), 100) : [];
  return (
    <>
      <PageTitle title="Orders" subtitle="Paid orders on items you can access (latest 100)." />
      {orders.length === 0 ? <EmptyState title="No paid orders yet" /> : <OrdersTable orders={orders} settings={await getPlatformSettings()} batched />}
    </>
  );
}
