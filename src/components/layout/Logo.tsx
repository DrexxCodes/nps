/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
      <img src="/icons/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-full" />
      NPS
    </Link>
  );
}
