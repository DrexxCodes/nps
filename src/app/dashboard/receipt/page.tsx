import Link from "next/link";
import { Receipt as ReceiptIcon } from "lucide-react";
import { Receipt, type ReceiptData } from "@/components/student/Receipt";
import { ReceiptWatcher } from "@/components/student/ReceiptWatcher";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { db } from "@/lib/server/firebase-admin";
import { getUserDoc } from "@/lib/server/profile";
import { requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import type { SubItem } from "@/types";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

const REFERENCE = /^NAPSS-NAU-\d+-[A-Z]{2,}$/;

/**
 * Paystack's callback lands here with ?reference=... (and trxref). We look the reference up in our own `References` collection:
 * paid > show the receipt; anything else > ReceiptWatcher keeps checking, and falls back to asking Paystack after 5 seconds.
 */
export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const user = await requirePageUser();
  const q = await searchParams;
  const reference = q.reference ?? q.trxref ?? "";
  const missing = <EmptyState icon={<ReceiptIcon className="size-6" />} title="No receipt to show" body="Open a receipt from your orders, or complete a payment to get one." action={<Link href="/dashboard/orders" className={buttonClass()}>My orders</Link>} />;
  if (!REFERENCE.test(reference)) return missing;

  const ref = (await db().doc(`References/${reference}`).get()).data();
  if (!ref || ref.userId !== user.uid) return missing;
  if (ref.status !== "SUCCESSFUL") return <ReceiptWatcher reference={reference} />;

  const [txnSnap, orderSnap, me, settings] = await Promise.all([db().doc(`transactions/${reference}`).get(), db().doc(`orders/${ref.orderId}`).get(), getUserDoc(user.uid), getPlatformSettings()]);
  const t = txnSnap.data();
  const o = orderSnap.data();
  if (!t || !o) return <ReceiptWatcher reference={reference} />; // record is being written: keep checking
  const data: ReceiptData = {
    reference, itemName: t.itemNameSnapshot, paidAt: o.paidAt, timeZone: settings.schoolTimezone, payerName: me?.fullName ?? "", payerEmail: me?.email ?? user.email ?? "",
    lines: ((t.selectedSubItems ?? []) as SubItem[]).map((s) => ({ name: s.name, priceKobo: s.priceKobo })),
    options: ((t.selectedVariants ?? []) as { setName: string; options: { label: string }[] }[]).map((v) => `${v.setName}: ${v.options.map((x) => x.label).join(", ")}`).join(" · "),
    subtotalKobo: t.subtotalKobo, platformFeeKobo: t.platformFeeKobo, otherFeesKobo: t.otherFeesKobo, totalKobo: t.amountKobo,
    physical: o.physical !== false, batchNumber: o.batchNumber ?? null, batched: !!t.batchId || !!o.batchPending,
  };
  return <Receipt r={data} />;
}
