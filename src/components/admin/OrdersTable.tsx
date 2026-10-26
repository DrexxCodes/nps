import { FulfillmentBadge, PaymentBadge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/money";
import { describeVariants } from "@/lib/variants";
import { db } from "@/lib/server/firebase-admin";
import { derivedAcademicYear } from "@/lib/server/profile";
import type { PlatformSettings } from "@/types";

type O = Record<string, any> & { id: string }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Minimal student fields only (name, admission no., year). Students are fetched in one batched read, not one by one. */
export async function OrdersTable({ orders, settings, batched }: { orders: O[]; settings: PlatformSettings; batched: boolean }) {
  const ids = [...new Set(orders.map((o) => o.userId as string))];
  const snaps = ids.length ? await db().getAll(...ids.map((id) => db().doc(`users/${id}`))) : [];
  const users = new Map(snaps.map((s) => [s.id, s.data()]));
  const showOptions = orders.some((o) => (o.selectedVariants?.length ?? 0) > 0); // only when this item has variable sets
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]"><tr>{["Student", "Admission no.", "Year", ...(showOptions ? ["Options"] : []), "Reference", "Amount", "Paid", "Batch", "Status"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{orders.map((o) => { const u = users.get(o.userId); return (
          <tr key={o.id} className="border-b border-[var(--line)] last:border-0">
            <td className="px-4 py-3 font-medium">{u?.fullName ?? "Unknown"}</td><td className="px-4 py-3">{u?.admissionNumber ?? "Pending"}</td>
            <td className="px-4 py-3">{derivedAcademicYear(u?.admissionNumber ?? null, settings) ?? "-"}</td>
            {showOptions && <td className="px-4 py-3 text-xs">{describeVariants(o.selectedVariants) || "-"}</td>}<td className="px-4 py-3 font-mono text-xs">{o.reference}</td>
            <td className="px-4 py-3">{formatNaira(o.totalAmount)}</td>
            <td className="px-4 py-3">{new Date(o.paidAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td><td className="px-4 py-3">{o.batchNumber ?? (o.batchPending ? "Needs batch" : "-")}</td>
            <td className="px-4 py-3"><div className="flex gap-1.5"><PaymentBadge status={o.paymentStatus} /><FulfillmentBadge fulfillment={o.fulfillmentStatus} batched={batched && !!o.batchId} /></div></td>
          </tr>); })}</tbody>
      </table>
    </div>
  );
}
