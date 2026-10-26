import { redirect } from "next/navigation";
import { BatchManager, type BatchRow } from "@/components/admin/BatchManager";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { listBatches } from "@/lib/server/batches";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ItemBatches({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const item = await requireManageItem(user, (await params).itemId).catch(() => redirect("/forbidden"));
  const batches = (await listBatches(item.id)) as unknown as BatchRow[];
  const count = ((await db().doc(`items/${item.id}`).get()).data()?.batchCount as number) ?? batches.length;
  return (
    <>
      <PageTitle title={item.name} subtitle="Batches" /><ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      {!item.batchProcessingEnabled ? <EmptyState title="Batches are off for this item" body="Turn on “Process in batches” in the item details." /> : batches.length === 0 ? <EmptyState title="No batches yet" body="The first batch is created when the first student starts checkout." /> : <BatchManager itemId={item.id} batches={batches} sizeLocked={item.batchLimitEnabled && count >= item.maxBatches} />}
    </>
  );
}
