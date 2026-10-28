/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Page not found" };

// Rendered inside the root layout, so the header and footer always stay.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center md:py-12">
      {/* The SVG is transparent with dark strokes, so it is colour-inverted in dark mode to stay visible. */}
      <img src="/404.svg" alt="" width={584} height={490} className="h-auto w-full max-w-sm dark:[filter:invert(1)_hue-rotate(180deg)]" />
      <p className="mt-6 font-display text-sm font-bold uppercase tracking-widest text-[var(--accent)]">Error 404</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">This page skipped enrolment.</h1>
      <p className="mt-3 max-w-md text-[var(--muted)]">We checked the batch queue, the pickup desk and behind your student ID. Nothing. Either the link is wrong, or this page graduated without telling us.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass()}>Take me home</Link>
        <Link href="/items" className={buttonClass("outline")}>Browse items</Link>
      </div>
    </div>
  );
}
