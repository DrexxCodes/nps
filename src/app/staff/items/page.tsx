import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { itemsForUser } from "@/lib/server/items";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "My items" };
export const dynamic = "force-dynamic";

export default async function StaffItems() {
  const items = await itemsForUser(await requirePageUser(OPS_ROLES));
  return (
    <>
      <PageTitle title="My items" />
      {items.length === 0 ? <EmptyState title="No items assigned" body="An admin needs to assign you to an item before you can see its orders." /> : <div className="space-y-3">{items.map((i) => <Card key={i.id} className="flex items-center justify-between"><span className="font-semibold">{i.name}</span><span className="flex gap-2">{i.batchProcessingEnabled && <Badge>batched</Badge>}{i.nfcEnabled && <Badge tone="blue">NFC</Badge>}<Badge tone={i.status === "ACTIVE" ? "green" : "gray"}>{i.status.toLowerCase()}</Badge></span></Card>)}</div>}
    </>
  );
}
