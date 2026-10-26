import { redirect } from "next/navigation";
import { ItemTabs } from "@/components/admin/ItemTabs";
import { StaffManager } from "@/components/admin/StaffManager";
import { PageTitle } from "@/components/ui/States";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ItemStaff({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const item = await requireManageItem(user, (await params).itemId).catch(() => redirect("/forbidden"));
  const docs = await Promise.all(item.assignedStaffIds.map((uid) => db().doc(`users/${uid}`).get()));
  const staff = docs.filter((d) => d.exists).map((d) => ({ uid: d.id, fullName: d.data()!.fullName as string, email: (d.data()!.email as string) ?? "" }));
  return <><PageTitle title={item.name} subtitle="Staff assigned to this item" /><ItemTabs id={item.id} batched={item.batchProcessingEnabled} /><StaffManager itemId={item.id} staff={staff} /></>;
}
