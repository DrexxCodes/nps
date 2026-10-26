import { redirect } from "next/navigation";
import { SubNav } from "@/components/layout/SubNav";
import { roleHome } from "@/lib/roles";
import { requirePageUser } from "@/lib/server/session";

const LINKS = [
  { href: "/dashboard", label: "Overview" }, { href: "/dashboard/orders", label: "Orders" }, { href: "/dashboard/transactions", label: "Payments" },
  { href: "/dashboard/profile", label: "My profile" }, { href: "/dashboard/settings", label: "Settings" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (user.role !== "STUDENT") redirect(roleHome(user.role));
  return <><SubNav links={LINKS} />{children}</>;
}
