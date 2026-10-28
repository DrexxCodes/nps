import { PortalSwitch } from "@/components/layout/PortalSwitch";
import { SubNav } from "@/components/layout/SubNav";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

const LINKS = [{ href: "/staff", label: "Overview" }, { href: "/staff/collect", label: "Collect" }, { href: "/staff/orders", label: "Orders" }, { href: "/staff/items", label: "My items" }, { href: "/staff/nfc", label: "NFC" }, { href: "/staff/exports", label: "Exports" }];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(OPS_ROLES);
  return <><PortalSwitch role={user.role} current="staff" /><SubNav links={LINKS} />{children}</>;
}
