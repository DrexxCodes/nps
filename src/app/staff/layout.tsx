import { SubNav } from "@/components/layout/SubNav";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

const LINKS = [{ href: "/staff", label: "Overview" }, { href: "/staff/collect", label: "Collect" }, { href: "/staff/orders", label: "Orders" }, { href: "/staff/items", label: "My items" }, { href: "/staff/nfc", label: "NFC" }, { href: "/staff/exports", label: "Exports" }];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(OPS_ROLES);
  return <><SubNav links={LINKS} />{children}</>;
}
