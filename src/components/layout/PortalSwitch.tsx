import Link from "next/link";
import type { Role } from "@/types";

type Portal = "student" | "staff" | "admin";

/**
 * Staff, admins and the super admin are often students too: they can pay for items from the student dashboard and run their desk
 * from the staff/admin one. This pill switches between the two. Students never see it.
 */
export function PortalSwitch({ role, current }: { role: Role; current: Portal }) {
  if (role === "STUDENT") return null;
  const tabs: { key: Portal; label: string; href: string }[] = [{ key: "student", label: "Student", href: "/dashboard" }, role === "STAFF" ? { key: "staff", label: "Staff", href: "/staff" } : { key: "admin", label: "Admin", href: "/admin" }];
  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]">
      <span>Viewing as</span>
      <div role="group" aria-label="Switch dashboard" className="glass inline-flex rounded-full p-1">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} aria-current={t.key === current ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${t.key === current ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "hover:bg-[var(--accent-soft)] hover:text-[var(--fg)]"}`}>{t.label}</Link>
        ))}
      </div>
    </div>
  );
}
