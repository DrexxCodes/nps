import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { CREDO_BASE_URLS, PROVIDER_REQUEST_TIMEOUT_MS } from "@/constants/payment-providers";
import { credoSignature, feeToKobo, mapCredoStatus, readCredoMetadata, toKobo } from "@/lib/credo";
import { AppError } from "../errors";
import { getCredoConfig, type CredoConfig } from "./config";
import type { PaymentProvider } from "./types";

interface CredoEnvelope<T> { status: number; message: string; data: T | undefined; httpStatus: number }

/**
 * Credo authenticates with the key itself in `Authorization` (no "Bearer").
 * Initialize uses the PUBLIC key; verify and everything else uses the SECRET key.
 */
async function call<T>(cfg: CredoConfig, key: string, path: string, init?: RequestInit): Promise<CredoEnvelope<T>> {
  const res = await fetch(`${CREDO_BASE_URLS[cfg.environment]}${path}`, {
    ...init,
    headers: { Authorization: key, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as { status?: number; message?: string; data?: T } | null;
  if (!json) throw new Error(`Credo ${path} returned a non-JSON response (${res.status})`);
  return { status: typeof json.status === "number" ? json.status : res.status, message: json.message ?? "", data: json.data, httpStatus: res.status };
}

interface CredoTransaction {
  transRef: string;
  businessRef: string;
  transAmount: number;
  transFeeAmount?: number;
  currencyCode: string;
  status: number;
  metadata?: unknown;
}

const sameHex = (a: string, b: string): boolean => {
  const x = Buffer.from(a.trim().toLowerCase());
  const y = Buffer.from(b.trim().toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
};

export const credo: PaymentProvider = {
  id: "credo",
  isConfigured: async () => !!(await getCredoConfig()),

  async initialize(p) {
    const cfg = await getCredoConfig();
    if (!cfg) throw new AppError("PROVIDER_NOT_CONFIGURED");
    const [firstName, ...rest] = p.name.trim().split(/\s+/);
    const res = await call<{ authorizationUrl?: string; reference?: string; credoReference?: string; crn?: string }>(cfg, cfg.publicKey, "/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount: p.amountKobo, // kobo
        email: p.email,
        currency: "NGN",
        bearer: 1, // merchant bears Credo's fee, so the student is charged exactly our total (same as the Paystack setup)
        channels: ["CARD", "BANK"],
        initializeAccount: 0,
        reference: p.reference,
        callbackUrl: p.callbackUrl,
        customerFirstName: firstName || undefined,
        customerLastName: rest.join(" ") || undefined,
        narration: p.narration.replace(/[\r\n]+/g, " ").slice(0, 100),
        metadata: { customFields: [{ variable_name: "user_id", value: p.metadata.userId, display_name: "User ID" }, { variable_name: "item_id", value: p.metadata.itemId, display_name: "Item ID" }] },
      }),
    });
    const url = res.data?.authorizationUrl;
    if (res.status !== 200 || !url) return { ok: false, message: `Credo rejected initialization (HTTP ${res.httpStatus}, status ${res.status}): ${res.message || "no message"}` };
    return { ok: true, authorizationUrl: url, providerRef: res.data?.credoReference ?? p.reference };
  },

  async verify(p) {
    const cfg = await getCredoConfig();
    if (!cfg) throw new AppError("PROVIDER_NOT_CONFIGURED");
    // Verification is by Credo's own reference (transRef / credoReference). Older records without one fall back to ours.
    const res = await call<CredoTransaction>(cfg, cfg.secretKey, `/transaction/${encodeURIComponent(p.providerRef ?? p.reference)}/verify`);
    if (res.status === 404 || res.httpStatus === 404 || /not found/i.test(res.message)) return { ok: false, notFound: true, message: res.message || "Transaction not found" };
    const d = res.data;
    if (res.status !== 200 || !d) return { ok: false, notFound: false, message: res.message || `Credo verify failed (HTTP ${res.httpStatus})` };
    return {
      ok: true,
      transaction: {
        provider: "credo",
        reference: d.businessRef, // our reference: confirmPayment rejects it if it is not the one being confirmed
        providerTransactionId: d.transRef,
        status: mapCredoStatus(d.status),
        amountKobo: toKobo(d.transAmount, p.expectedAmountKobo),
        currency: d.currencyCode,
        feesKobo: feeToKobo(d.transFeeAmount, d.transAmount, p.expectedAmountKobo),
        metadata: readCredoMetadata(d.metadata),
      },
    };
  },

  async parseWebhook(raw, headers) {
    const cfg = await getCredoConfig();
    if (!cfg) return { valid: false, reason: "Credo is not configured" };
    // The Credo docs say X-Credo-Signature; the dashboard's Webhooks page says the token arrives in X-Signature. Accept all three.
    const given = headers.get("x-credo-signature") ?? headers.get("credo-signature") ?? headers.get("x-signature");
    if (!given) return { valid: false, reason: `missing signature (headers received: ${[...headers.keys()].join(", ")})` };
    // Checked against OUR stored keys (never the business code in the payload). A signature pasted from the dashboard is accepted too.
    const computed = credoSignature(cfg.secretKey, cfg.businessCode);
    // The dashboard's Token is a secret we also hold (webhookSignature), so SHA-512(token + businessCode) proves the sender knows it too.
    const sha512 = (s: string) => createHash("sha512").update(s).digest("hex");
    const withToken = cfg.webhookSignature === "" ? "" : sha512(cfg.webhookSignature + cfg.businessCode);
    const ok = sameHex(given, computed) || (cfg.webhookSignature !== "" && (sameHex(given, cfg.webhookSignature) || sameHex(given, withToken)));
    if (!ok) {
      // Diagnostics only: lengths and yes/no matches for each way the signature might be built, never the values themselves.
      const t = cfg.webhookSignature, k = cfg.secretKey, b = cfg.businessCode;
      const tries: Record<string, string> = {
        "sha512(secret+code)": computed, "sha512(code+secret)": sha512(b + k), "sha512(token+code)": t ? sha512(t + b) : "", "sha512(code+token)": t ? sha512(b + t) : "",
        "sha512(token)": t ? sha512(t) : "", "sha512(secret)": sha512(k), "hmac512(secret,body)": createHmac("sha512", k).update(raw).digest("hex"), "hmac512(token,body)": t ? createHmac("sha512", t).update(raw).digest("hex") : "",
      };
      console.warn("[webhook] credo signature mismatch", { receivedLength: given.trim().length, savedLength: t.length, environment: cfg.environment, matches: Object.entries(tries).filter(([, v]) => v && sameHex(given, v)).map(([n]) => n) });
      return { valid: false, reason: "bad signature" };
    }

    let body: { event?: string; data?: { businessCode?: string; transRef?: string; businessRef?: string } };
    try { body = JSON.parse(raw); } catch { return { valid: true, event: { kind: "ignored" } }; }
    const d = body.data;
    if (d?.businessCode && d.businessCode !== cfg.businessCode) return { valid: false, reason: "business code mismatch" };

    if (body.event === "transaction.successful" && d?.businessRef) return { valid: true, event: { kind: "payment", reference: d.businessRef, providerRef: d.transRef ?? null } };
    if (body.event === "transaction.transaction.transfer.reverse") return { valid: true, event: { kind: "reversal", reference: d?.businessRef ?? null } };
    return { valid: true, event: { kind: "ignored" } }; // transaction.failed and settlement events: the receipt/verify flow settles failures
  },
};
