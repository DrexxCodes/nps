import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PROVIDER_REQUEST_TIMEOUT_MS } from "@/constants/payment-providers";
import type { NormalizedStatus } from "@/lib/payment-status";
import { AppError } from "../errors";
import { getPaystackConfig } from "./config";
import type { PaymentProvider } from "./types";

const BASE = "https://api.paystack.co";

export type PaystackResult<T> = { status: boolean; message: string; data: T; httpStatus: number };

async function call<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
  const cfg = await getPaystackConfig();
  if (!cfg) throw new AppError("PROVIDER_NOT_CONFIGURED");
  // Paystack answers a wrong key with a generic rejection, so catch the usual slips here: public key pasted, quotes or spaces.
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(cfg.secretKey)) throw new Error("The Paystack secret key must be a secret key (sk_test_... or sk_live_...) with no quotes or spaces.");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.secretKey}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as { status: boolean; message: string; data: T } | null;
  if (!json) throw new Error(`Paystack ${path} returned a non-JSON response (${res.status})`);
  return { ...json, httpStatus: res.status };
}

interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  fees?: number | null;
  metadata?: { userId?: string; itemId?: string } | null;
}

const mapStatus = (s: string): NormalizedStatus => (s === "success" ? "success" : s === "failed" ? "failed" : s === "abandoned" ? "abandoned" : s === "reversed" ? "reversed" : "pending");

/** Verifies x-paystack-signature (HMAC-SHA512 of the raw body). */
function validSignature(rawBody: string, signature: string | null, secretKey: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const listBanks = () => call<{ name: string; code: string; slug: string }[]>("/bank?country=nigeria&perPage=200&use_cursor=false");
export const resolveAccount = (accountNumber: string, bankCode: string) =>
  call<{ account_name: string; account_number: string }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);

export const paystack: PaymentProvider = {
  id: "paystack",
  isConfigured: async () => !!(await getPaystackConfig()),

  async initialize(p) {
    const res = await call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ email: p.email, amount: p.amountKobo, currency: "NGN", reference: p.reference, callback_url: p.callbackUrl, metadata: p.metadata }),
    });
    // Paystack's own message says exactly why (e.g. "Invalid key", "Invalid Amount Sent", "Invalid callback url"): keep it in the log.
    if (!res.status) return { ok: false, message: `Paystack rejected initialization (HTTP ${res.httpStatus}): ${res.message}` };
    return { ok: true, authorizationUrl: res.data.authorization_url, providerRef: res.data.reference };
  },

  async verify(p) {
    const res = await call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(p.reference)}`);
    if (!res.status) return { ok: false, notFound: /not found/i.test(res.message), message: res.message };
    const d = res.data;
    return { ok: true, transaction: { provider: "paystack", reference: d.reference, providerTransactionId: String(d.id), status: mapStatus(d.status), amountKobo: d.amount, currency: d.currency, feesKobo: d.fees ?? null, metadata: d.metadata ?? null } };
  },

  async parseWebhook(raw, headers) {
    const cfg = await getPaystackConfig();
    if (!cfg) return { valid: false, reason: "Paystack is not configured" };
    if (!validSignature(raw, headers.get("x-paystack-signature"), cfg.secretKey)) return { valid: false, reason: "bad signature" };
    let event: { event?: string; data?: { reference?: string } };
    try { event = JSON.parse(raw); } catch { return { valid: true, event: { kind: "ignored" } }; }
    if (event.event !== "charge.success" || !event.data?.reference) return { valid: true, event: { kind: "ignored" } };
    return { valid: true, event: { kind: "payment", reference: event.data.reference, providerRef: event.data.reference } };
  },
};
