import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { PwaEntry } from "@/components/layout/PwaEntry";
import { roleHome } from "@/lib/roles";
import { getSessionUser } from "@/lib/server/session";

export default async function Home() {
  const user = await getSessionUser().catch(() => null);
  const dashboardHref = user ? roleHome(user.role) : null;
  return (
    // -mb-16 cancels the footer's top margin so the last panel meets the footer.
    <div data-landing className="-mb-16">
      <PwaEntry href={dashboardHref ?? "/login"} />
      <SmoothScroll>
        <Hero dashboardHref={dashboardHref} />
        <HowItWorks />
      </SmoothScroll>
    </div>
  );
}
