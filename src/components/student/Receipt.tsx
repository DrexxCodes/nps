import { Fragment } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PrintButton } from "@/components/student/PrintButton";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatNaira } from "@/lib/money";

export interface ReceiptData {
  reference: string; itemName: string; paidAt: number; timeZone: string; payerName: string; payerEmail: string;
  lines: { name: string; priceKobo: number }[]; options: string;
  subtotalKobo: number; platformFeeKobo: number; otherFeesKobo: number; totalKobo: number;
  physical: boolean; batchNumber: number | null; batched: boolean;
}

/** Proof of payment. Everything here comes from the snapshot taken when the order was paid, never from the item as it is now. */
export function Receipt({ r }: { r: ReceiptData }) {
  const next = !r.physical ? "Nothing to collect. This receipt is your proof of payment."
    : r.batchNumber ? `Your order is in Batch ${r.batchNumber}. Its progress shows in My orders and updates by itself.`
    : r.batched ? "Your order is paid and waiting to be placed in a batch. We'll show it in My orders." : "Collect it from NAPSS staff and show this reference.";
  const row = (k: string, v: string, bold = false) => <div className={`flex justify-between gap-4 ${bold ? "border-t border-[var(--line)] pt-2 text-base font-bold" : ""}`}><dt>{k}</dt><dd className="text-right">{v}</dd></div>;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card className="print-area space-y-5 p-6 sm:p-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 size-12 text-[var(--accent)]" aria-hidden />
          <h1 className="font-display text-2xl font-bold">Payment received</h1>
          <p className="mt-1 font-display text-3xl font-extrabold">{formatNaira(r.totalKobo)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{r.itemName}</p>
        </div>
        <dl className="space-y-1.5 text-sm">
          {row("Reference", r.reference)}
          {row("Paid on", new Date(r.paidAt).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short", timeZone: r.timeZone }))}
          {row("Paid by", `${r.payerName} (${r.payerEmail})`)}
          {r.options && row("Options", r.options)}
        </dl>
        <dl className="space-y-1.5 border-t border-[var(--line)] pt-4 text-sm">
          {r.lines.map((l, i) => <Fragment key={i}>{row(l.name, formatNaira(l.priceKobo))}</Fragment>)}
          {row("Subtotal", formatNaira(r.subtotalKobo))}
          {r.platformFeeKobo > 0 && row("Platform fee", formatNaira(r.platformFeeKobo))}
          {r.otherFeesKobo > 0 && row("Other fees", formatNaira(r.otherFeesKobo))}
          {row("Total paid", formatNaira(r.totalKobo), true)}
        </dl>
        <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">{next}</p>
      </Card>
      <div className="no-print flex flex-wrap justify-center gap-3">
        <Link href="/dashboard/orders" className={buttonClass()}>View my orders</Link>
        <PrintButton />
        <Link href="/items" className={buttonClass("ghost")}>Browse items</Link>
      </div>
    </div>
  );
}
