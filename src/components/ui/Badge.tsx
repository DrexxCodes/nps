const tones = {
  green: "bg-[var(--accent-soft)] text-[var(--accent)]",
  amber: "bg-amber-500/15 text-[var(--warn)]",
  red: "bg-red-500/15 text-[var(--danger)]",
  gray: "bg-black/5 dark:bg-white/10 text-[var(--muted)]",
  blue: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

const PAYMENT: Record<string, [keyof typeof tones, string]> = {
  SUCCESSFUL: ["green", "Paid"], PENDING: ["amber", "Pending"], INITIALIZED: ["amber", "Awaiting payment"], FAILED: ["red", "Failed"], ABANDONED: ["gray", "Abandoned"], REVERSED: ["red", "Reversed"], REFUNDED: ["blue", "Refunded"],
};
export const PaymentBadge = ({ status }: { status: string }) => <Badge tone={PAYMENT[status]?.[0] ?? "gray"}>{PAYMENT[status]?.[1] ?? status}</Badge>;

/** Student-facing fulfillment state: delivered > batch status > awaiting. */
export function FulfillmentBadge({ fulfillment, batchStatus, batched }: { fulfillment: string; batchStatus?: string | null; batched: boolean }) {
  if (fulfillment === "DELIVERED") return <Badge tone="green">Delivered</Badge>;
  if (fulfillment === "NOT_REQUIRED") return <Badge tone="gray">No collection needed</Badge>;
  if (!batched) return <Badge tone="amber">Awaiting collection</Badge>;
  if (batchStatus === "READY_FOR_PICKUP") return <Badge tone="blue">Ready for pickup</Badge>;
  if (batchStatus === "PROCESSING") return <Badge tone="amber">Processing</Badge>;
  return <Badge tone="gray">Queued</Badge>;
}
