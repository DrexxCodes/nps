import { CollectClient } from "@/components/staff/CollectClient";
import { PageTitle } from "@/components/ui/States";
import { OPS_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Collect" };
export default async function Collect() {
  await requirePageUser(OPS_ROLES);
  return <><PageTitle title="Collect" subtitle="Search, check the details, then confirm the handover." /><CollectClient /></>;
}
