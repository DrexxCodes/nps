import { describe, expect, it } from "vitest";
import { credoSignature, feeToKobo, mapCredoStatus, readCredoMetadata, toKobo } from "@/lib/credo";

describe("Credo webhook signature", () => {
  it("is SHA-512 (hex) of secretKey + businessCode, as documented", () => {
    const sig = credoSignature("secret", "700607002190001");
    expect(sig).toMatch(/^[a-f0-9]{128}$/);
    expect(sig).toBe(credoSignature("secret", "700607002190001"));
    expect(sig).not.toBe(credoSignature("secret", "700607002190002"));
    expect(sig).not.toBe(credoSignature("secreu", "700607002190001"));
  });
});

describe("Credo status mapping", () => {
  it("treats paid and settlement states as success", () => { for (const c of [0, 4, 5]) expect(mapCredoStatus(c)).toBe("success"); });
  it("maps failures, cancellations and refunds", () => {
    expect(mapCredoStatus(3)).toBe("failed");
    expect(mapCredoStatus(7)).toBe("failed");
    for (const c of [9, 10, 14, 15]) expect(mapCredoStatus(c)).toBe("abandoned");
    for (const c of [1, 2]) expect(mapCredoStatus(c)).toBe("reversed");
  });
  it("keeps in-progress states pending, and anything unknown", () => { for (const c of [6, 12, 13, 99]) expect(mapCredoStatus(c)).toBe("pending"); });
});

describe("Credo amount units", () => {
  it("accepts kobo or naira, reporting kobo", () => {
    expect(toKobo(150000, 150000)).toBe(150000);
    expect(toKobo(1500, 150000)).toBe(150000);
    expect(toKobo(1500.0, 150000)).toBe(150000);
  });
  it("leaves a genuinely different amount different so it fails the equality check", () => {
    expect(toKobo(1000, 150000)).not.toBe(150000);
    expect(toKobo(100000, 150000)).not.toBe(150000);
  });
  it("converts the fee in the same unit as the amount", () => {
    expect(feeToKobo(3250, 150000, 150000)).toBe(3250);
    expect(feeToKobo(32.5, 1500, 150000)).toBe(3250);
    expect(feeToKobo(undefined, 1500, 150000)).toBeNull();
  });
});

describe("Credo metadata", () => {
  it("reads the custom fields we send", () => {
    expect(readCredoMetadata({ customFields: [{ variable_name: "user_id", value: "u1" }, { variable_name: "item_id", value: "i1" }] })).toEqual({ userId: "u1", itemId: "i1" });
  });
  it("returns null when absent or malformed", () => {
    expect(readCredoMetadata(undefined)).toBeNull();
    expect(readCredoMetadata({ customFields: "x" })).toBeNull();
    expect(readCredoMetadata({ customFields: [] })).toBeNull();
  });
});
