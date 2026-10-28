import { notFound } from "next/navigation";
import { ProfileDetails } from "@/components/profile/public/ProfileDetails";
import { ProfileHeader } from "@/components/profile/public/ProfileHeader";
import { getPublicProfile } from "@/lib/server/profile";
import { getPlatformSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ admissionNumber: string }> }) {
  const p = await getPublicProfile((await params).admissionNumber, await getPlatformSettings());
  return { title: p ? p.fullName : "Student profile", robots: { index: false } };
}

export default async function StudentProfile({ params }: { params: Promise<{ admissionNumber: string }> }) {
  const p = await getPublicProfile((await params).admissionNumber, await getPlatformSettings());
  if (!p) notFound();
  return (
    // data-plain: flat background, no aurora (see globals.css). Full-width, left-aligned, like the digital ID layout.
    <div data-plain className="w-full px-1 py-4 sm:px-4 sm:py-8 lg:px-8 lg:py-12">
      <ProfileHeader p={p} />
      <ProfileDetails p={p} />
    </div>
  );
}
