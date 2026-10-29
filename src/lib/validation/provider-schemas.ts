import { z } from "zod";
import { CREDO_ENVIRONMENTS, PROVIDER_IDS } from "@/constants/payment-providers";

const NO_JUNK = /^[^\s"'`]*$/;
const junkMsg = "Remove spaces and quotes from this value";

/** Secrets may be left blank on edit, which keeps the stored value. */
const optionalSecret = (pattern?: RegExp, message?: string) =>
  z.string().trim().max(512).regex(NO_JUNK, junkMsg).refine((v) => v === "" || !pattern || pattern.test(v), message ?? "Check this value");

export const paystackConfigSchema = z.object({
  secretKey: optionalSecret(/^sk_(test|live)_[A-Za-z0-9]+$/, "Paystack secret keys start with sk_live_ or sk_test_"),
  publicKey: optionalSecret(/^pk_(test|live)_[A-Za-z0-9]+$/, "Paystack public keys start with pk_live_ or pk_test_"),
});

export const credoConfigSchema = z.object({
  environment: z.enum(CREDO_ENVIRONMENTS),
  publicKey: z.string().trim().min(1, "Enter your Credo public key").max(512).regex(NO_JUNK, junkMsg).regex(/^\S+$/, junkMsg),
  secretKey: optionalSecret(),
  businessCode: z.string().trim().min(1, "Enter your Credo business code").max(60).regex(/^[A-Za-z0-9_-]+$/, "The business code has letters and numbers only"),
  /** Optional: the signing signature exactly as shown in the Credo dashboard. Credo's documented SHA-512(secret key + business code) is always accepted too. */
  webhookSignature: optionalSecret(/^[A-Za-z0-9+/=_-]{16,512}$/, "That does not look like a webhook signature"),
  clearWebhookSignature: z.boolean(),
});

export const activeProviderSchema = z.object({ provider: z.enum(PROVIDER_IDS) });
