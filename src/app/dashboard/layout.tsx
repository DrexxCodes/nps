import { PortalSwitch } from "@/components/layout/PortalSwitch";
import { SubNav } from "@/components/layout/SubNav";
import { requirePageUser } from "@/lib/server/session";

const LINKS = [
  { href: "/dashboard", label: "Overview" }, { href: "/dashboard/orders", label: "Orders" }, { href: "/dashboard/transactions", label: "Payments" },
  { href: "/dashboard/profile", label: "My profile" }, { href: "/dashboard/settings", label: "Settings" },
];

/** The student dashboard is for every signed-in role: staff and admins buy and track items here like anyone else. */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <><PortalSwitch role={user.role} current="student" /><SubNav links={LINKS} />{children}</>;
}
