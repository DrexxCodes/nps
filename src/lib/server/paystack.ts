import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const BASE = "https://api.paystack.co";

export type PaystackResult<T> = { status: boolean; message: string; data: T; httpStatus: number };

async function call<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
  const key = env().PAYSTACK_SECRET_KEY;
  // Paystack answers a wrong key with a generic rejection, so catch the usual slips here: public key pasted, quotes or spaces in .env.
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(key)) throw new Error("PAYSTACK_SECRET_KEY must be a secret key (sk_test_... or sk_live_...) with no quotes or spaces. Check .env.local");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env().PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status: boolean; message: string; data: T } | null;
  if (!json) throw new Error(`Paystack ${path} returned a non-JSON response (${res.status})`);
  return { ...json, httpStatus: res.status };
}

export interface PaystackTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "pending" | "ongoing" | "reversed" | string;
  reference: string;
  amount: number;
  currency: string;
  fees?: number | null;
  metadata?: { userId?: string; itemId?: string } | null;
}

export const initializeTransaction = (p: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata: Record<string, string> }) =>
  call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({ email: p.email, amount: p.amountKobo, currency: "NGN", reference: p.reference, callback_url: p.callbackUrl, metadata: p.metadata }),
  });

export const verifyTransaction = (reference: string) => call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
export const listBanks = () => call<{ name: string; code: string; slug: string }[]>("/bank?country=nigeria&perPage=200&use_cursor=false");
export const resolveAccount = (accountNumber: string, bankCode: string) =>
  call<{ account_name: string; account_number: string }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);

/** Verifies x-paystack-signature (HMAC-SHA512 of the raw body). */
export function validSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", env().PAYSTACK_SECRET_KEY).update(rawBody).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
