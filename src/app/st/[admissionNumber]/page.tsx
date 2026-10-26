import { notFound } from "next/navigation";
import { Cake, Facebook, Github, Instagram, Linkedin, MessageCircle, Music2, Ghost } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { getPublicProfile } from "@/lib/server/profile";
import { getPlatformSettings } from "@/lib/server/settings";
import type { SocialPlatform } from "@/types";

export const dynamic = "force-dynamic";
const ICONS: Record<SocialPlatform, [typeof Github, string]> = {
  whatsapp: [MessageCircle, "WhatsApp"], facebook: [Facebook, "Facebook"], tiktok: [Music2, "TikTok"], snapchat: [Ghost, "Snapchat"], linkedin: [Linkedin, "LinkedIn"], instagram: [Instagram, "Instagram"], github: [Github, "GitHub"],
};

export async function generateMetadata({ params }: { params: Promise<{ admissionNumber: string }> }) {
  const p = await getPublicProfile((await params).admissionNumber, await getPlatformSettings());
  return { title: p ? p.fullName : "Student profile", robots: { index: false } };
}

export default async function StudentProfile({ params }: { params: Promise<{ admissionNumber: string }> }) {
  const p = await getPublicProfile((await params).admissionNumber, await getPlatformSettings());
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-md">
      <Card className="flex flex-col items-center p-8 text-center">
        <Avatar name={p.fullName} src={p.avatarUrl} size={112} />
        <h1 className="mt-4 font-display text-2xl font-bold">{p.fullName}</h1>
        <p className="text-sm text-[var(--muted)]">{p.admissionNumber}{p.academicYear && p.academicYear > 0 ? ` · Year ${p.academicYear}` : ""}</p>
        {p.birthday && <p className="mt-2 flex items-center gap-1.5 text-sm"><Cake className="size-4 text-[var(--accent)]" />{p.birthday}</p>}
        {p.bio && <p className="mt-4 whitespace-pre-line text-sm">{p.bio}</p>}
        {p.socials.length > 0 && (
          <ul className="mt-6 flex gap-3">
            {p.socials.map((s) => { const [Icon, label] = ICONS[s.platform]; return <li key={s.platform}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={label} className="grid size-11 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-110"><Icon className="size-5" /></a></li>; })}
          </ul>
        )}
      </Card>
    </div>
  );
}
