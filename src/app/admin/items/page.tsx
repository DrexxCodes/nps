import Link from "next/link";
import { Plus } from "lucide-react";
import { ItemStatusBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { itemsForUser } from "@/lib/server/items";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Items" };
export const dynamic = "force-dynamic";

export default async function AdminItems() {
  const user = await requirePageUser(ADMIN_ROLES);
  const items = await itemsForUser(user);
  return (
    <>
      <PageTitle title="Items" action={<Link href="/admin/items/new" className={buttonClass("primary", "sm")}><Plus className="size-4" />New item</Link>} />
      {items.length === 0 ? <EmptyState title="No items yet" body="Create your first payment item. You can add sub-items, batches and NFC later." action={<Link href="/admin/items/new" className={buttonClass()}>Create item</Link>} /> : (
        <div className="grid gap-3">{items.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3">
            <div><Link href={`/admin/items/${i.id}`} className="font-display text-lg font-bold hover:underline">{i.name}</Link><p className="text-sm text-[var(--muted)]">{i.hasSubItems ? `${i.subItems.length} sub-items` : formatNaira(i.basePriceKobo)}{i.batchProcessingEnabled ? " · batched" : ""}</p></div>
            <div className="flex items-center gap-2"><ItemStatusBadge status={i.status} />
              <Link href={`/admin/items/${i.id}/orders`} className={buttonClass("outline", "sm")}>Orders</Link>{i.batchProcessingEnabled && <Link href={`/admin/items/${i.id}/batches`} className={buttonClass("outline", "sm")}>Batches</Link>}</div>
          </Card>))}</div>
      )}
    </>
  );
}
