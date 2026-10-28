import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { HERO_IMAGE } from "@/data/landing";
import { ParallaxBg } from "./ParallaxBg";

/**
 * Full-bleed photo hero: breaks out of the centred page column to span the whole viewport width, and slides up
 * behind the floating navbar. Dark scrim keeps the light text readable in both themes.
 */
export function Hero({ dashboardHref }: { dashboardHref: string | null }) {
  const onPhoto = "border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20";
  return (
    <section className="relative isolate -mt-[5.75rem] ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] overflow-hidden text-white">
      <ParallaxBg src={HERO_IMAGE} />
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,.9), rgba(0,0,0,.7) 55%, rgba(0,0,0,.5))" }} />
      <div className="relative mx-auto flex min-h-[34rem] w-full max-w-6xl flex-col justify-end px-5 pb-12 pt-32 sm:min-h-[80svh] sm:px-8 sm:pb-16 lg:px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">NAPSS Payment Suite</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Buy NAPSS items from your phone.</h1>
          <p className="mt-5 max-w-lg text-lg text-white/80">Browse what you may need to pay for in the department, pay securely and track your order from queue to pickup.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/items" className={buttonClass()}>Browse items</Link>
            {dashboardHref
              ? <Link href={dashboardHref} className={`${buttonClass("ghost")} ${onPhoto}`}>Go to dashboard</Link>
              : <><Link href="/enroll" className={`${buttonClass("ghost")} ${onPhoto}`}>Enroll now</Link><Link href="/login" className={`${buttonClass("ghost")} ${onPhoto}`}>Sign in</Link></>}
          </div>
        </div>
      </div>
    </section>
  );
}
