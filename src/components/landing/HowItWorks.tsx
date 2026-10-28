import { LANDING_STEPS } from "@/data/landing";
import { StepPanel } from "./StepPanel";

/** Full-bleed stack of sticky panels (breaks out of the page column like the hero). */
export function HowItWorks() {
  return (
    <article aria-labelledby="how" className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]">
      <h2 id="how" className="sr-only">How it works</h2>
      {LANDING_STEPS.map((s, i) => (
        <StepPanel key={s.title} index={i} total={LANDING_STEPS.length} icon={s.icon} title={s.title} text={s.text} tone={s.tone}
          overlap={i === 0} cta={i === LANDING_STEPS.length - 1 ? { href: "/items", label: "Browse items" } : undefined} />
      ))}
    </article>
  );
}
