import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { ItemCard } from "@/components/items/ItemCard";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { isPurchasable } from "@/lib/item-status";
import { toStudentItem } from "@/lib/pricing";
import { db } from "@/lib/server/firebase-admin";
import { syncItemStatuses, toItem } from "@/lib/server/items";
import { getSessionUser } from "@/lib/server/session";
import { currentClassYear } from "@/lib/server/student-class";

export const metadata = { title: "Items" };
export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fitems"); // the catalog (and its class prices) is for signed-in users only
  const [snap, year] = await Promise.all([db().collection("items").where("status", "in", ["ACTIVE", "SCHEDULED"]).get(), currentClassYear(user.uid)]);
  const items = (await syncItemStatuses(snap.docs.map(toItem))).filter((i) => isPurchasable(i)).map((i) => toStudentItem(i, year)); // prices for the viewer's class only
  return (
    <>
      <PageTitle title="Items" subtitle="Everything you can pay for right now." />
      {items.length === 0 ? <EmptyState icon={<Package className="size-6" />} title="No payment items are currently available" body="When NAPSS opens a new item, it will show up here." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div>}
    </>
  );
}
