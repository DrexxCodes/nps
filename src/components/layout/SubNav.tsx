"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Scrollable pill tabs for each portal (student / staff / admin). Works on any width. */
export function SubNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  const exact = links.map((l) => l.href).filter((h) => links.some((o) => o.href !== h && o.href.startsWith(h)));
  const isActive = (href: string) => (exact.includes(href) ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Section" className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex w-max gap-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={isActive(l.href) ? "page" : undefined}
              className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${isActive(l.href) ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "glass hover:bg-[var(--accent-soft)]"}`}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
