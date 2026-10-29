import "server-only";
import { DEFAULT_PROVIDER, PROVIDER_IDS, type ProviderId } from "@/constants/payment-providers";
import { getActiveProviderId } from "./config";
import { credo } from "./credo";
import { paystack } from "./paystack";
import type { PaymentProvider } from "./types";

const registry: Record<ProviderId, PaymentProvider> = { paystack, credo };

export const isProviderId = (v: unknown): v is ProviderId => PROVIDER_IDS.includes(v as ProviderId);
export const getProvider = (id: ProviderId): PaymentProvider => registry[id];

/** Provider for NEW payments: whatever the Super Admin has switched on. */
export const getActiveProvider = async (): Promise<PaymentProvider> => registry[await getActiveProviderId()];

/** Provider that took an EXISTING payment. Stored on the reference at checkout, so switching never strands in-flight payments. */
export const providerOfReference = (ref: { provider?: unknown } | undefined | null): ProviderId => (isProviderId(ref?.provider) ? ref.provider : DEFAULT_PROVIDER);

export type { PaymentProvider, NormalizedTransaction, VerifyResult } from "./types";
