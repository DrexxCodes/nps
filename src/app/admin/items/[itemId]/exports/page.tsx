import { redirect } from "next/navigation";
import { ExportForm } from "@/components/admin/ExportForm";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { PageTitle } from "@/components/ui/States";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ItemExports({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const item = await requireManageItem(user, (await params).itemId).catch(() => redirect("/forbidden"));
  return <><PageTitle title={item.name} subtitle="Export paid orders as PDF" /><ItemTabs id={item.id} batched={item.batchProcessingEnabled} /><ExportForm items={[{ id: item.id, name: item.name }]} fixedItemId={item.id} physical={item.physical} /></>;
}
