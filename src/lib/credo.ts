import { createHash } from "node:crypto";
import type { NormalizedStatus } from "@/lib/payment-status";

/**
 * Credo signs every webhook with SHA-512(secretKey + businessCode) in the X-Credo-Signature header.
 * It is a fixed digest, not an HMAC of the body, so it proves the sender knows the keys but says nothing about the body.
 * That is why the webhook handler never trusts the payload and always re-verifies the transaction through the API.
 */
export const credoSignature = (secretKey: string, businessCode: string): string => createHash("sha512").update(secretKey + businessCode).digest("hex");

/** Credo transaction status codes (docs: Concepts > Transaction statuses). */
export function mapCredoStatus(code: number): NormalizedStatus {
  switch (code) {
    case 0: case 4: case 5: return "success"; // 4/5 = queued for / paid out in settlement, which only happens after a successful payment
    case 3: case 7: return "failed"; // failed, or declined by fraud check
    case 1: case 2: return "reversed"; // refunded / queued for refund
    case 9: case 10: case 14: case 15: return "abandoned"; // cancelled by customer or merchant, or checkout opened/generated but never paid
    default: return "pending"; // 6 review, 12 awaiting bank transfer credit, 13 attempted
  }
}

/**
 * The docs show amounts in kobo on initialize/verify but whole naira with decimals in the webhook example.
 * We know what we charged, so read the reported number in whichever unit reproduces it, and report in kobo.
 * An amount that matches neither way is returned as-is and fails the caller's equality check.
 */
export function toKobo(reported: number, expectedKobo: number): number {
  if (reported === expectedKobo) return reported;
  if (Math.round(reported * 100) === expectedKobo) return expectedKobo;
  return Math.round(reported);
}

/** Fees follow the same unit as the amount: if the amount was naira, so is the fee. */
export function feeToKobo(fee: number | null | undefined, reportedAmount: number, expectedKobo: number): number | null {
  if (typeof fee !== "number" || !Number.isFinite(fee)) return null;
  const naira = reportedAmount !== expectedKobo && Math.round(reportedAmount * 100) === expectedKobo;
  return Math.round(naira ? fee * 100 : fee);
}

/** We send `userId` and `itemId` as Credo custom fields; read them back if the API returns them. */
export function readCredoMetadata(metadata: unknown): { userId?: string; itemId?: string } | null {
  const fields = (metadata as { customFields?: unknown } | null | undefined)?.customFields;
  if (!Array.isArray(fields)) return null;
  const pick = (name: string) => {
    const f = fields.find((x) => (x as { variable_name?: string } | null)?.variable_name === name) as { value?: unknown } | undefined;
    return typeof f?.value === "string" ? f.value : undefined;
  };
  const userId = pick("user_id");
  const itemId = pick("item_id");
  return userId || itemId ? { userId, itemId } : null;
}
