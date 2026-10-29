import { PaymentProvidersPanel } from "@/components/admin/payments/PaymentProvidersPanel";
import { SettingsAdminForm } from "@/components/admin/SettingsAdminForm";
import { PageTitle } from "@/components/ui/States";
import { isProd } from "@/lib/server/env";
import { getProviderOverview } from "@/lib/server/providers/config";
import { requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "Platform settings" };
export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  await requirePageUser(["SUPER_ADMIN"]);
  const [settings, overview] = await Promise.all([getPlatformSettings(), getProviderOverview()]);
  return <><PageTitle title="Platform settings" subtitle="Super Admin only." /><SettingsAdminForm settings={settings} /><PaymentProvidersPanel overview={overview} isProd={isProd()} /></>;
}
