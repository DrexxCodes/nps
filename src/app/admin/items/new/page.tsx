import { ItemForm } from "@/components/admin/ItemForm";
import { PageTitle } from "@/components/ui/States";
import { getPlatformSettings } from "@/lib/server/settings";

export const metadata = { title: "New item" };
export const dynamic = "force-dynamic";
export default async function NewItem() {
  const { courseDurationYears } = await getPlatformSettings();
  return <><PageTitle title="New item" /><ItemForm courseYears={courseDurationYears} /></>;
}
