import { ExportForm } from "@/components/admin/ExportForm";
import { PageTitle } from "@/components/ui/States";
import { itemsForUser } from "@/lib/server/items";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Exports" };
export default async function StaffExports() {
  const items = await itemsForUser(await requirePageUser(OPS_ROLES));
  return <><PageTitle title="Exports" subtitle="Fulfillment lists for your items." /><ExportForm items={items.map((i) => ({ id: i.id, name: i.name }))} /></>;
}
