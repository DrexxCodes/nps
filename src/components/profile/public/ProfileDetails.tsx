import { SOCIAL_ICONS } from "@/data/social-icons";
import { socialDisplay } from "@/lib/social";
import type { PublicProfile } from "@/types";

const eyebrow = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

/** Tab-style heading (static, one tab) on a rule, then About on the left and Links on the right. */
export function ProfileDetails({ p }: { p: PublicProfile }) {
  const empty = !p.bio && p.socials.length === 0;
  return (
    <div className="mt-10">
      <div className="flex w-full border-b border-[var(--line)]">
        <h2 className="relative min-h-[44px] py-3 text-sm font-medium after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[var(--fg)]">Profile</h2>
      </div>
      <div className="pt-10">
        {empty ? (
          <p className="text-sm text-[var(--muted)]">This student has not added a bio or links yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">
            {p.bio && (
              <div className="min-w-0">
                <p className={eyebrow}>About</p>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed">{p.bio}</p>
              </div>
            )}
            {p.socials.length > 0 && (
              <div className={`min-w-0 ${p.bio ? "md:border-l md:border-[var(--line)] md:pl-16 lg:pl-24" : ""}`}>
                <p className={eyebrow}>Links</p>
                <ul className="mt-3 grid grid-cols-1 gap-y-5">
                  {p.socials.map((s) => {
                    const { Icon, label } = SOCIAL_ICONS[s.platform];
                    return (
                      <li key={s.platform} className="border-t border-[var(--line)] pt-3">
                        <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="group flex min-h-[44px] items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><Icon className="size-4" /></span>
                          <span className="min-w-0"><span className="block text-xs text-[var(--muted)]">{label}</span><span className="block truncate text-sm font-medium group-hover:underline">{socialDisplay(s.url)}</span></span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
