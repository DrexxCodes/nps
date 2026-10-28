/* eslint-disable @next/next/no-img-element */
import { RIGHTS } from "@/constants";
import type { PublicProfile } from "@/types";

const eyebrow = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

export function ProfileHeader({ p }: { p: PublicProfile }) {
  const year = p.academicYear && p.academicYear > 0 ? `Year ${p.academicYear}` : null;
  return (
    <>
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <img src={p.avatarUrl} alt={`Avatar of ${p.fullName}`} width={112} height={112}
          className="size-24 shrink-0 rounded-full border border-[var(--line)] bg-[var(--accent-soft)] object-cover sm:size-28" />
        <div className="min-w-0 flex-1">
          <p className={eyebrow}>Student Profile</p>
          <h1 className="mt-1 break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">{p.fullName}</h1>
          <dl className="mt-4 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            <div><dt className="text-xs text-[var(--muted)]">Admission number</dt><dd className="text-sm font-medium tabular-nums">{p.admissionNumber}</dd></div>
            {year && <div><dt className="text-xs text-[var(--muted)]">Class</dt><dd className="text-sm font-medium">{year}</dd></div>}
          </dl>
        </div>
      </header>

      <section aria-label="Membership" className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-[var(--line)] py-4 text-sm">
        <div className="flex items-baseline gap-2"><span className="text-[var(--muted)]">Association</span><span className="font-semibold">{RIGHTS}</span></div>
        {p.birthday && (
          <>
            <span className="hidden h-4 w-px bg-[var(--line)] sm:block" aria-hidden />
            <div className="flex items-baseline gap-2"><span className="text-[var(--muted)]">Birthday</span><span className="font-semibold">{p.birthday}</span></div>
          </>
        )}
      </section>
    </>
  );
}
