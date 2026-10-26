import { getSessionUser } from "@/lib/server/session";
import { Logo } from "./Logo";
import { NavClient } from "./NavClient";

export async function Navbar() {
  const user = await getSessionUser().catch(() => null);
  const links = [
    { href: "/", label: "Home" },
    ...(user ? [{ href: user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? "/admin" : user.role === "STAFF" ? "/staff" : "/dashboard", label: "Dashboard" }] : []),
    { href: "/items", label: "Services" },
    { href: "/journals", label: "Journals" },
    ...(user ? [{ href: "/dashboard/settings", label: "Profile settings" }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="glass glass-nav relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl px-4">
        <Logo />
        <NavClient links={links} signedIn={!!user} />
      </div>
    </header>
  );
}
