/** Can staff hand this order over right now? Pure, so the server check, the search API and the UI all agree. */
export interface PickupInput {
  fulfillmentStatus: string;
  batchingEnabled: boolean;
  batchNumber: number | null;
  batchStatus: string | null;
  batchPending?: boolean;
}
export interface Readiness { ready: boolean; delivered: boolean; reason: string | null }

const RULE = "It must be marked Ready for pickup before it can be delivered.";

export function pickupReadiness(i: PickupInput): Readiness {
  if (i.fulfillmentStatus === "DELIVERED") return { ready: false, delivered: true, reason: null };
  if (!i.batchingEnabled || i.batchStatus === "READY_FOR_PICKUP") return { ready: true, delivered: false, reason: null };
  if (i.batchPending || (i.batchNumber === null && i.batchStatus === null)) {
    return { ready: false, delivered: false, reason: `This order is paid but hasn't been placed in a batch yet, so the item isn't ready. ${RULE}` };
  }
  const batch = i.batchNumber ? `Batch ${i.batchNumber}` : "Their batch";
  if (i.batchStatus === "PROCESSING") return { ready: false, delivered: false, reason: `Their item isn't ready: ${batch} is still being processed. ${RULE}` };
  if (i.batchStatus === "QUEUED") return { ready: false, delivered: false, reason: `Their item isn't ready: ${batch} is still queued. ${RULE}` };
  return { ready: false, delivered: false, reason: `Their item isn't ready: ${batch} hasn't reached pickup. ${RULE}` };
}
