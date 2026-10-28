import { describe, expect, it } from "vitest";
import { trackingSteps } from "@/lib/tracking";
import { itemSchema } from "@/lib/validation/schemas";

const base = { physical: true, fulfillmentStatus: "AWAITING", batched: true, batchStatus: "QUEUED" as string | null, batchPending: false };
const states = (o: Parameters<typeof trackingSteps>[0]) => trackingSteps(o).map((s) => `${s.label}:${s.state}`);

describe("order tracking steps", () => {
  it("follows the batch the admin controls", () => {
    expect(states(base)).toEqual(["Paid:done", "Queued:current", "Processing:todo", "Ready for pickup:todo", "Delivered:todo"]);
    expect(states({ ...base, batchStatus: "PROCESSING" })).toEqual(["Paid:done", "Queued:done", "Processing:current", "Ready for pickup:todo", "Delivered:todo"]);
    expect(states({ ...base, batchStatus: "READY_FOR_PICKUP" })).toEqual(["Paid:done", "Queued:done", "Processing:done", "Ready for pickup:current", "Delivered:todo"]);
  });
  it("completes everything once delivered", () => {
    expect(trackingSteps({ ...base, fulfillmentStatus: "DELIVERED", batchStatus: "READY_FOR_PICKUP" }).every((s) => s.state === "done")).toBe(true);
  });
  it("has no batch steps when the item is not batched", () => {
    expect(states({ ...base, batched: false, batchStatus: null })).toEqual(["Paid:done", "Awaiting collection:current", "Delivered:todo"]);
  });
  it("is just Paid for items with nothing to collect", () => {
    expect(states({ ...base, physical: false, fulfillmentStatus: "NOT_REQUIRED", batched: false, batchStatus: null })).toEqual(["Paid:done"]);
  });
});

describe("non-physical items", () => {
  const item = { name: "Departmental dues", basePriceKobo: 500000 };
  it("default to physical", () => expect(itemSchema.parse(item).physical).toBe(true));
  it("can never be batched or NFC-encoded", () => {
    const parsed = itemSchema.parse({ ...item, physical: false, batchProcessingEnabled: true, nfcEnabled: true });
    expect(parsed.physical).toBe(false);
    expect(parsed.batchProcessingEnabled).toBe(false);
    expect(parsed.nfcEnabled).toBe(false);
  });
  it("keeps batching for physical items", () => expect(itemSchema.parse({ ...item, batchProcessingEnabled: true }).batchProcessingEnabled).toBe(true));
});

describe("avatar route", () => {
  it("serves a cacheable Lorelei SVG and rejects odd seeds", async () => {
    const { GET } = await import("@/app/api/avatar/[seed]/route");
    const ok = await GET(new Request("http://x"), { params: Promise.resolve({ seed: "a1b2c3" }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/svg+xml");
    expect(ok.headers.get("cache-control")).toContain("immutable");
    expect((await ok.text()).startsWith("<svg")).toBe(true);
    const bad = await GET(new Request("http://x"), { params: Promise.resolve({ seed: "<script>" }) });
    expect(bad.status).toBe(400);
  });
});
