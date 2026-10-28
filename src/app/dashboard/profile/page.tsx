import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { getPublicProfile } from "@/lib/server/profile";
import { getUserDoc } from "@/lib/server/profile";
import { requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function MyProfile() {
  const user = await requirePageUser();
  const u = await getUserDoc(user.uid);
  const pub = u?.admissionNumber ? await getPublicProfile(u.admissionNumber, await getPlatformSettings()) : null;
  return (
    <>
      <PageTitle title="My public profile" subtitle="This is exactly what anyone with your link can see." action={u?.admissionNumber && <Link href={`/st/${u.admissionNumber}`} className={buttonClass("outline", "sm")}>Open public page</Link>} />
      {!pub ? <EmptyState title="Your public profile isn't live yet" body="Add your admission number in settings to get your profile link." action={<Link href="/dashboard/settings" className={buttonClass()}>Open settings</Link>} /> : (
        <Card className="max-w-md space-y-3 text-center"><div className="flex justify-center"><Avatar name={pub.fullName} src={pub.avatarUrl} size={96} /></div><h2 className="font-display text-xl font-bold">{pub.fullName}</h2><p className="text-sm text-[var(--muted)]">{pub.admissionNumber}{pub.academicYear && pub.academicYear > 0 ? ` · Year ${pub.academicYear}` : ""}</p>{pub.bio && <p className="text-sm">{pub.bio}</p>}<p className="text-xs text-[var(--muted)]">{pub.socials.length} social link(s) shown · birthday {pub.birthday ? "visible" : "hidden"}</p></Card>
      )}
    </>
  );
}
