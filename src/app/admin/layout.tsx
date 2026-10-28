import { PortalSwitch } from "@/components/layout/PortalSwitch";
import { SubNav } from "@/components/layout/SubNav";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(ADMIN_ROLES);
  const links = [
    { href: "/admin", label: "Overview" }, { href: "/admin/items", label: "Items" }, { href: "/admin/withdrawals", label: "Money" }, { href: "/admin/users", label: "Users" },
    ...(user.role === "SUPER_ADMIN" ? [{ href: "/admin/settings", label: "Platform settings" }, { href: "/admin/audit-logs", label: "Audit log" }] : []),
  ];
  return <><PortalSwitch role={user.role} current="admin" /><SubNav links={links} />{children}</>;
}
