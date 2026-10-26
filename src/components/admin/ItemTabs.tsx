import { SubNav } from "@/components/layout/SubNav";

export function ItemTabs({ id, batched }: { id: string; batched: boolean }) {
  return <SubNav links={[{ href: `/admin/items/${id}`, label: "Details" }, { href: `/admin/items/${id}/orders`, label: "Orders" }, ...(batched ? [{ href: `/admin/items/${id}/batches`, label: "Batches" }] : []), { href: `/admin/items/${id}/staff`, label: "Staff" }, { href: `/admin/items/${id}/exports`, label: "Exports" }]} />;
}
