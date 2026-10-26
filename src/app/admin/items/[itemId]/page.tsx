import { ItemForm } from "@/components/admin/ItemForm";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { SuspendButton } from "@/components/admin/SuspendButton";
import { PageTitle } from "@/components/ui/States";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditItem({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const { itemId } = await params;
  const item = await requireManageItem(user, itemId).catch(() => redirect("/forbidden"));
  const { courseDurationYears } = await getPlatformSettings();
  return (
    <>
      <PageTitle title={item.name} action={<SuspendButton itemId={item.id} suspended={item.status === "SUSPENDED"} />} />
      <ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      <ItemForm item={item} courseYears={courseDurationYears} />
    </>
  );
}
