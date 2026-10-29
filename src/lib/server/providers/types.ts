import type { ProviderId } from "@/constants/payment-providers";
import type { NormalizedStatus } from "@/lib/payment-status";

/** What every provider hands back after verifying a transaction. Amounts are always kobo. */
export interface NormalizedTransaction {
  provider: ProviderId;
  /** Our own reference (NAPSS-NAU-...). */
  reference: string;
  /** The provider's id/reference for the transaction. */
  providerTransactionId: string;
  status: NormalizedStatus;
  amountKobo: number;
  currency: string;
  feesKobo: number | null;
  metadata: { userId?: string; itemId?: string } | null;
}

export interface InitializeParams {
  email: string;
  name: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  narration: string;
  metadata: { userId: string; itemId: string };
}

export type InitializeResult = { ok: true; authorizationUrl: string; providerRef: string } | { ok: false; message: string };

export interface VerifyParams {
  reference: string;
  /** The provider's own reference when we have one (Credo needs it to look the payment up). */
  providerRef: string | null;
  expectedAmountKobo: number;
}

export type VerifyResult = { ok: true; transaction: NormalizedTransaction } | { ok: false; notFound: boolean; message: string };

export type WebhookEvent =
  | { kind: "payment"; reference: string; providerRef: string | null }
  | { kind: "reversal"; reference: string | null }
  | { kind: "ignored" };

export type WebhookParse = { valid: false; reason: string } | { valid: true; event: WebhookEvent };

export interface PaymentProvider {
  id: ProviderId;
  isConfigured(): Promise<boolean>;
  initialize(p: InitializeParams): Promise<InitializeResult>;
  verify(p: VerifyParams): Promise<VerifyResult>;
  /** Authenticates the request against this provider's stored keys and extracts what we act on. Never trusts the payload. */
  parseWebhook(raw: string, headers: Headers): Promise<WebhookParse>;
}
