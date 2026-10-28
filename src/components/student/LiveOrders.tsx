"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { FulfillmentBadge, PaymentBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { api } from "@/lib/client/api";
import { formatNaira } from "@/lib/money";
import { trackingSteps, type TrackedOrder } from "@/lib/tracking";

const POLL_MS = 8000;

/** Orders that stay in step with the server: re-checks every few seconds while visible and whenever the tab regains focus, so a new order or an admin's batch change shows without a manual refresh. */
export function LiveOrders({ initial, compact = false, limit }: { initial: TrackedOrder[]; compact?: boolean; limit?: number }) {
  const [orders, setOrders] = useState(initial);
  useEffect(() => setOrders(initial), [initial]);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await api<{ orders: TrackedOrder[] }>("/api/orders");
      if (alive && r.ok) setOrders(r.orders);
    };
    void pull();
    const id = setInterval(pull, POLL_MS);
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("focus", pull);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", pull); window.removeEventListener("focus", pull); };
  }, []);

  const shown = limit ? orders.slice(0, limit) : orders;
  if (shown.length === 0) return <EmptyState icon={<ShoppingBag className="size-6" />} title="No orders yet" body="Orders appear here as soon as a payment is confirmed." action={<Link href="/items" className={buttonClass()}>Browse items</Link>} />;

  if (compact) return (
    <div className="space-y-3">{shown.map((o) => (
      <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">{o.itemName}</p><p className="text-xs text-[var(--muted)]">{o.batchNumber ? `Batch ${o.batchNumber} · ` : ""}{o.reference}</p></div>
        <FulfillmentBadge fulfillment={o.fulfillmentStatus} batchStatus={o.batchStatus} batched={o.batched} />
      </Card>))}
    </div>
  );

  return (
    <div className="space-y-3">{shown.map((o) => {
      const steps = trackingSteps(o);
      return (
        <Card key={o.id} className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-display text-lg font-bold">{o.itemName}</h3><p className="text-xs text-[var(--muted)]">Ref {o.reference} · {new Date(o.paidAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p></div><b>{formatNaira(o.totalKobo)}</b></div>
          {o.subItems.length > 0 && <p className="text-sm text-[var(--muted)]">{o.subItems.join(", ")}</p>}
          {o.options && <p className="text-sm text-[var(--muted)]">{o.options}</p>}
          <div className="flex flex-wrap items-center gap-2"><PaymentBadge status={o.paymentStatus} /><FulfillmentBadge fulfillment={o.fulfillmentStatus} batchStatus={o.batchStatus} batched={o.batched} />{o.batchNumber && <span className="text-xs text-[var(--muted)]">Batch {o.batchNumber}</span>}{o.batchPending && <span className="text-xs text-[var(--warn)]">Batch assignment pending</span>}</div>
          {steps.length > 1 && (
            <ol className="flex items-center gap-1 overflow-x-auto pt-1 text-xs [scrollbar-width:none]" aria-label="Order progress">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-1 whitespace-nowrap" aria-current={s.state === "current" ? "step" : undefined}>
                  <span className={`size-2.5 rounded-full ${s.state === "done" ? "bg-[var(--accent)]" : s.state === "current" ? "bg-[var(--accent)] ring-4 ring-[var(--accent-soft)]" : "bg-[var(--line)]"}`} />
                  <span className={s.state === "todo" ? "text-[var(--muted)]" : "font-medium"}>{s.label}</span>
                  {i < steps.length - 1 && <span className={`mx-1 h-px w-5 ${s.state === "done" ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`} />}
                </li>))}
            </ol>
          )}
          {o.deliveredAt && <p className="text-xs text-[var(--muted)]">Delivered {new Date(o.deliveredAt).toLocaleString("en-NG")}</p>}
          <Link href={`/dashboard/receipt?reference=${o.reference}`} className="inline-block text-sm text-[var(--accent)] hover:underline">View receipt</Link>
        </Card>);
    })}</div>
  );
}
