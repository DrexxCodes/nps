/** One order as a student sees it, with its batch status resolved. Plain data, so it can cross the server/client boundary and the API. */
export interface TrackedOrder {
  id: string;
  itemId: string;
  itemName: string;
  reference: string;
  paidAt: number;
  totalKobo: number;
  subItems: string[];
  options: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  physical: boolean;
  batched: boolean;
  batchNumber: number | null;
  batchStatus: string | null;
  batchPending: boolean;
  deliveredAt: number | null;
}

export interface TrackStep { label: string; state: "done" | "current" | "todo" }

/** The journey of one order: Paid > (Queued > Processing > Ready for pickup) > Delivered. Items with no collection are simply Paid. */
export function trackingSteps(o: Pick<TrackedOrder, "physical" | "fulfillmentStatus" | "batched" | "batchStatus" | "batchPending">): TrackStep[] {
  if (!o.physical || o.fulfillmentStatus === "NOT_REQUIRED") return [{ label: "Paid", state: "done" }];
  const delivered = o.fulfillmentStatus === "DELIVERED";
  const labels = o.batched ? ["Paid", "Queued", "Processing", "Ready for pickup", "Delivered"] : ["Paid", "Awaiting collection", "Delivered"];
  let at: number;
  if (delivered) at = labels.length - 1;
  else if (!o.batched) at = 1;
  else at = o.batchStatus === "READY_FOR_PICKUP" ? 3 : o.batchStatus === "PROCESSING" ? 2 : 1;
  return labels.map((label, i) => ({ label, state: i < at || (delivered && i === at) ? "done" : i === at ? "current" : "todo" }));
}
