import { DEVELOPER, RIGHTS } from "@/constants";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
      <p>Developed by {DEVELOPER}</p>
      <p>All rights reserved to {RIGHTS}.</p>
    </footer>
  );
}
