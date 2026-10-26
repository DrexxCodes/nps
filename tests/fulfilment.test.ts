import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({ db: () => ({}) }));

import { pickupReadiness } from "@/lib/fulfilment";
import { salesStatsPaths } from "@/lib/server/stats";
import { parseOrderCursor } from "@/lib/server/queries";

const base = { fulfillmentStatus: "AWAITING", batchingEnabled: true, batchNumber: 2, batchStatus: "QUEUED" as string | null };

describe("pickupReadiness", () => {
  it("blocks delivery while the batch is queued or processing, and says why", () => {
    const q = pickupReadiness(base);
    expect(q.ready).toBe(false);
    expect(q.reason).toMatch(/Batch 2 is still queued/);
    expect(q.reason).toMatch(/Ready for pickup/);
    expect(pickupReadiness({ ...base, batchStatus: "PROCESSING" }).reason).toMatch(/still being processed/);
  });
  it("allows delivery once the batch is ready for pickup", () => {
    expect(pickupReadiness({ ...base, batchStatus: "READY_FOR_PICKUP" })).toEqual({ ready: true, delivered: false, reason: null });
  });
  it("treats a paid order with no batch yet as not ready", () => {
    const r = pickupReadiness({ ...base, batchNumber: null, batchStatus: null, batchPending: true });
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/hasn't been placed in a batch/);
  });
  it("does not need a batch when the item has no batch processing", () => {
    expect(pickupReadiness({ ...base, batchingEnabled: false, batchNumber: null, batchStatus: null }).ready).toBe(true);
  });
  it("reports delivered orders as delivered, never ready", () => {
    expect(pickupReadiness({ ...base, fulfillmentStatus: "DELIVERED", batchStatus: "READY_FOR_PICKUP" })).toEqual({ ready: false, delivered: true, reason: null });
  });
});

describe("sales counters and paging helpers", () => {
  it("moves the owner's and the platform's totals together", () => {
    expect(salesStatsPaths("admin1")).toEqual(["stats/owner_admin1", "stats/platform"]);
  });
  it("parses only well-formed order cursors", () => {
    expect(parseOrderCursor("1792644767781_AbCdEfGhIjKl")).toEqual({ paidAt: 1792644767781, id: "AbCdEfGhIjKl" });
    expect(parseOrderCursor("nonsense")).toBeNull();
    expect(parseOrderCursor(undefined)).toBeNull();
  });
});
