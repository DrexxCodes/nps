/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CreditCard, Nfc, PackageCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/server/session";
import { roleHome } from "@/lib/roles";

export default async function Home() {
  const user = await getSessionUser().catch(() => null);
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-14">
      <div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Pay for your NAPSS ID from your phone.</h1>
        <p className="mt-5 max-w-md text-lg text-[var(--muted)]">Enroll once, pay securely with Paystack, then follow your order from queue to pickup. Staff tap, verify and hand over.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {user ? <Link href={roleHome(user.role)} className={buttonClass()}>Go to dashboard</Link> : <><Link href="/enroll" className={buttonClass()}>Enroll now</Link><Link href="/login" className={buttonClass("outline")}>Sign in</Link></>}
          <Link href="/items" className={buttonClass("ghost")}>Browse services</Link>
        </div>
        <ul className="mt-10 grid max-w-md gap-3 text-sm">
          {[[CreditCard, "Server-verified payments, no screenshots needed"], [PackageCheck, "Batch status you can check any time"], [Nfc, "NFC-ready cards that open your student profile"]].map(([Icon, t], i) => {
            const I = Icon as typeof CreditCard;
            return <li key={i} className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><I className="size-5" /></span>{t as string}</li>;
          })}
        </ul>
      </div>
      <div className="relative mx-auto grid h-72 w-full max-w-sm place-items-center sm:h-80" aria-hidden>
        <div className="glass relative flex h-52 w-80 max-w-full flex-col justify-between rounded-3xl p-5 [animation:float-card_7s_ease-in-out_infinite]">
          <div className="flex items-center justify-between"><img src="/icons/icon-192.png" alt="" className="size-11 rounded-full" /><Nfc className="size-6 text-[var(--accent)]" /></div>
          <div><p className="font-display text-xl font-bold">NAPSS Student ID</p><p className="text-sm text-[var(--muted)]">Nnamdi Azikiwe University</p></div>
        </div>
      </div>
    </div>
  );
}
