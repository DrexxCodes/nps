import { ItemForm } from "@/components/admin/ItemForm";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { SuspendButton } from "@/components/admin/SuspendButton";
import { PageTitle } from "@/components/ui/States";
import { ItemStatusControl } from "@/components/admin/ItemStatusControl";
import { ItemStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { purchaseNote } from "@/lib/item-status";
import { requireManageItem, syncItemStatus } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditItem({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const { itemId } = await params;
  const loaded = await requireManageItem(user, itemId).catch(() => redirect("/forbidden"));
  const item = await syncItemStatus(loaded); // status is checked against the schedule every time the page opens
  const { courseDurationYears } = await getPlatformSettings();
  return (
    <>
      <PageTitle title={item.name} action={<SuspendButton itemId={item.id} suspended={item.status === "SUSPENDED"} />} />
      <ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      <Card className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1"><p className="text-sm text-[var(--muted)]">Status</p><ItemStatusBadge status={item.status} /><p className="text-sm">{purchaseNote(item)}</p></div>
        <ItemStatusControl key={item.status} itemId={item.id} status={item.status} />
      </Card>
      <ItemForm key={`${item.status}-${item.updatedAt}`} item={item} courseYears={courseDurationYears} />
    </>
  );
}
