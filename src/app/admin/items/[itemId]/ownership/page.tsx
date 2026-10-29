import { redirect } from "next/navigation";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { TransferOwnershipForm } from "@/components/admin/ownership/TransferOwnershipForm";
import { PageTitle } from "@/components/ui/States";
import { requireManageItem } from "@/lib/server/items";
import { getUserDoc } from "@/lib/server/profile";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Item ownership" };
export const dynamic = "force-dynamic";

export default async function ItemOwnership({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const { itemId } = await params;
  const item = await requireManageItem(user, itemId).catch(() => redirect("/forbidden"));
  const owner = await getUserDoc(item.ownerAdminId);
  return (
    <>
      <PageTitle title={item.name} subtitle="Ownership" />
      <ItemTabs id={item.id} batched={item.batchProcessingEnabled} />
      <TransferOwnershipForm itemId={item.id} itemName={item.name} ownerName={owner?.fullName ?? "Unknown"} asOwner={item.ownerAdminId === user.uid} />
    </>
  );
}
