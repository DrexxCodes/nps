import { SettingsAdminForm } from "@/components/admin/SettingsAdminForm";
import { PageTitle } from "@/components/ui/States";
import { requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "Platform settings" };
export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  return <><PageTitle title="Platform settings" subtitle="Super Admin only." /><SettingsAdminForm settings={await getPlatformSettings()} /></>;
}
