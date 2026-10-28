import Link from "next/link";
import { EnrollForm } from "@/components/auth/EnrollForm";
import { SsoInline } from "@/components/auth/SsoInline";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { getSessionUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "Enroll" };
export const dynamic = "force-dynamic";

export default async function EnrollPage() {
  const settings = await getPlatformSettings().catch(() => null);
  if (settings && !settings.enrollmentOpen) {
    return <EmptyState title="Enrollment is closed" body="New enrollments are not being accepted right now. If you already have an account, you can still sign in." action={<Link href="/login" className={buttonClass()}>Sign in</Link>} />;
  }
  const user = await getSessionUser().catch(() => null);
  return (
    <div className="mx-auto max-w-xl">
      <SsoInline signedIn={!!user} />
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">Create your NPS account</h1>
        <p className="mb-6 mt-1 text-sm text-[var(--muted)]">Takes about two minutes. You'll pay for items after you sign in.</p>
        <EnrollForm />
      </Card>
    </div>
  );
}
