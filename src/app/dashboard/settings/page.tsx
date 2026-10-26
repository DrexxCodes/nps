import { SettingsForm, type SettingsInitial } from "@/components/profile/SettingsForm";
import { PageTitle } from "@/components/ui/States";
import { canonicalLgaName, canonicalStateName } from "@/lib/geo";
import { getUserDoc } from "@/lib/server/profile";
import { requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePageUser(["STUDENT"]);
  const u = await getUserDoc(user.uid);
  if (!u) return null;
  const ec = u.emergencyContacts?.[0] ?? { name: "", relationship: "", phone: "" };
  const initial: SettingsInitial = {
    fullName: u.fullName, username: u.username, phone: u.phone ?? "", email: u.email, dateOfBirth: u.dateOfBirth ?? "", bio: u.bio ?? "", allergies: u.allergies ?? "",
    stateOfOrigin: canonicalStateName(u.stateOfOrigin), localGovernmentArea: canonicalLgaName(u.stateOfOrigin, u.localGovernmentArea), birthdayVisibility: !!u.birthdayVisibility, socialLinks: u.socialLinks ?? {},
    activeSocialLinks: u.activeSocialLinks ?? [], emergency: ec, admissionNumber: u.admissionNumber, profileImageUrl: u.profileImageUrl,
    bankLabel: u.bankDetails ? `${u.bankDetails.bankName} · ******${String(u.bankDetails.accountNumber).slice(-4)} · ${u.bankDetails.accountName}` : null,
  };
  return <><PageTitle title="Settings" subtitle="Update your profile, privacy and account details." /><div className="max-w-2xl lg:max-w-none"><SettingsForm initial={initial} /></div></>;
}
