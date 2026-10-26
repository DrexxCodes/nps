import { NfcTool } from "@/components/staff/NfcTool";
import { PageTitle } from "@/components/ui/States";
import { itemsForUser } from "@/lib/server/items";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "NFC" };
export default async function Nfc() {
  const items = (await itemsForUser(await requirePageUser(OPS_ROLES))).filter((i) => i.nfcEnabled);
  return <><PageTitle title="NFC cards" subtitle="Payloads are built from verified student data." /><NfcTool items={items.map((i) => ({ id: i.id, name: i.name }))} /></>;
}
