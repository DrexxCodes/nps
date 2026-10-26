import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { db } from "@/lib/server/firebase-admin";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Withdrawal history" };
export const dynamic = "force-dynamic";

export default async function WithdrawalHistory() {
  const user = await requirePageUser(ADMIN_ROLES);
  const q = user.role === "SUPER_ADMIN" ? db().collection("withdrawals") : db().collection("withdrawals").where("ownerAdminId", "==", user.uid);
  const rows = (await q.get()).docs.map((d) => ({ id: d.id, ...d.data() })) as (Record<string, any> & { id: string })[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <>
      <PageTitle title="Withdrawal history" />
      {rows.length === 0 ? <EmptyState icon={<Wallet className="size-6" />} title="No withdrawals yet" body="Completed and pending transfers will be listed here with masked account numbers." /> : <div className="space-y-3">{rows.map((w) => <Card key={w.id} className="flex flex-wrap justify-between gap-2"><span>{formatNaira(w.amountKobo)} · {w.status}</span><span className="text-sm text-[var(--muted)]">{w.destinationAccountSnapshot?.accountName} · ******{String(w.destinationAccountSnapshot?.accountNumber ?? "").slice(-4)}</span></Card>)}</div>}
    </>
  );
}
