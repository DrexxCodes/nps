import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

const GRID = "bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]";

/** One full-screen sticky panel; later panels slide up over earlier ones as you scroll. */
export function StepPanel({ index, total, icon: Icon, title, text, tone, overlap = false, cta }: {
  index: number; total: number; icon: LucideIcon; title: string; text: string; tone: string; overlap?: boolean; cta?: { href: string; label: string };
}) {
  return (
    <section className={`sticky top-0 grid h-svh w-full place-content-center overflow-hidden rounded-t-3xl px-6 text-center ${tone} ${overlap ? "-mt-8" : ""}`}>
      <div aria-hidden className={`absolute inset-0 opacity-[0.12] ${GRID}`} />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-current/10"><Icon className="size-8" /></span>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] opacity-70">Step {index + 1} of {total}</p>
        <h3 className="mt-2 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl 2xl:text-7xl">{title}</h3>
        <p className="mt-5 max-w-md text-lg opacity-80">{text}</p>
        {cta && <Link href={cta.href} className={`${buttonClass()} mt-8`}>{cta.label}</Link>}
      </div>
    </section>
  );
}
