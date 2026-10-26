"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export function NavClient({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // Public student profile pages (/st/...) only offer Home and Journals.
  const shown = path.startsWith("/st/") ? links.filter((l) => l.href === "/" || l.href === "/journals") : links;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const item = (href: string, label: string) => (
    <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? "page" : undefined}
      className={`rounded-xl px-3 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] ${active(href) ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}>{label}</Link>
  );
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">{shown.map((l) => item(l.href, l.label))}</nav>
      <div className="hidden items-center gap-2 md:flex">
        <ThemeToggle />
        {signedIn ? <SignOutButton /> : <><Link href="/login" className={buttonClass("ghost", "sm")}>Sign in</Link><Link href="/enroll" className={buttonClass("primary", "sm")}>Enroll</Link></>}
      </div>
      <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid size-10 place-items-center rounded-xl hover:bg-[var(--accent-soft)]">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {open && (
        <div className="glass glass-nav absolute inset-x-3 top-[4.25rem] flex flex-col gap-1 rounded-2xl p-3 md:hidden">
          {shown.map((l) => item(l.href, l.label))}
          <div className="mt-1 border-t border-[var(--line)] pt-2">
            {signedIn ? <SignOutButton /> : <div className="flex gap-2"><Link href="/login" onClick={() => setOpen(false)} className={`${buttonClass("outline", "sm")} flex-1`}>Sign in</Link><Link href="/enroll" onClick={() => setOpen(false)} className={`${buttonClass("primary", "sm")} flex-1`}>Enroll</Link></div>}
          </div>
        </div>
      )}
    </>
  );
}
