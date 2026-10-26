import Link from "next/link";
import { PackageCheck, Nfc, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/States";
import { itemsForUser } from "@/lib/server/items";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function StaffHome() {
  const user = await requirePageUser(OPS_ROLES);
  const items = await itemsForUser(user);
  const tile = (href: string, Icon: typeof Nfc, title: string, sub: string) => <Link key={href} href={href}><Card className="h-full transition hover:-translate-y-0.5"><Icon className="mb-3 size-7 text-[var(--accent)]" /><h3 className="font-display text-lg font-bold">{title}</h3><p className="text-sm text-[var(--muted)]">{sub}</p></Card></Link>;
  return (
    <>
      <PageTitle title="Staff desk" subtitle={`${items.length} item(s) assigned to you`} />
      <div className="grid gap-4 sm:grid-cols-3">{tile("/staff/collect", ScanSearch, "Collect", "Find an order and hand it over")}{tile("/staff/orders", PackageCheck, "Orders", "Paid orders on your items")}{tile("/staff/nfc", Nfc, "NFC", "Write student cards")}</div>
    </>
  );
}
