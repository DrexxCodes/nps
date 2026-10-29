import type { CREDO_ENVIRONMENTS, ProviderId } from "@/constants/payment-providers";

export type CredoEnvironment = (typeof CREDO_ENVIRONMENTS)[number];

/** Everything below is safe to send to the browser: secrets appear only as a masked tail. */
export interface PaystackPublicView {
  configured: boolean;
  /** "env" = still running on PAYSTACK_SECRET_KEY from the environment; saving keys here overrides it. */
  source: "db" | "env" | null;
  publicKey: string;
  secretKeyMask: string;
}

export interface CredoPublicView {
  configured: boolean;
  environment: CredoEnvironment;
  publicKey: string;
  businessCode: string;
  secretKeyMask: string;
  hasWebhookSignature: boolean;
  webhookSignatureMask: string;
}

export interface ProviderOverview {
  active: ProviderId;
  paystack: PaystackPublicView;
  credo: CredoPublicView;
  webhookUrls: Record<ProviderId, string>;
  /** False until PROVIDER_SECRETS_KEY is set: keys cannot be saved without it. */
  encryptionReady: boolean;
  updatedAt: number | null;
}
