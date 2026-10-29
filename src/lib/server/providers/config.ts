import "server-only";
import { PROVIDER_CONFIG_CACHE_MS, PROVIDER_SETTINGS_DOC, PROVIDER_WEBHOOK_PATHS, DEFAULT_PROVIDER, type ProviderId } from "@/constants/payment-providers";
import type { CredoEnvironment, ProviderOverview } from "@/types/payment-providers";
import type { z } from "zod";
import type { credoConfigSchema, paystackConfigSchema } from "@/lib/validation/provider-schemas";
import { audit } from "../audit";
import { env } from "../env";
import { AppError } from "../errors";
import { db } from "../firebase-admin";
import { encryptionReady, maskSecret, open, seal } from "./crypto";

export interface PaystackConfig { secretKey: string; publicKey: string; source: "db" | "env" }
export interface CredoConfig { environment: CredoEnvironment; publicKey: string; secretKey: string; businessCode: string; /** "" when none was saved. */ webhookSignature: string }

/** Shape of settings/paymentProviders. Secrets are stored sealed (see crypto.ts). */
interface StoredDoc {
  activeProvider?: ProviderId;
  paystack?: { secretKey?: string; publicKey?: string };
  credo?: { environment?: CredoEnvironment; publicKey?: string; secretKey?: string; businessCode?: string; webhookSignature?: string };
  updatedAt?: number;
}

let cache: { at: number; data: StoredDoc } | null = null;
export const invalidateProviderConfig = (): void => { cache = null; };

async function load(): Promise<StoredDoc> {
  if (cache && Date.now() - cache.at < PROVIDER_CONFIG_CACHE_MS) return cache.data;
  const data = ((await db().doc(PROVIDER_SETTINGS_DOC).get()).data() ?? {}) as StoredDoc;
  cache = { at: Date.now(), data };
  return data;
}

export async function getActiveProviderId(): Promise<ProviderId> {
  const id = (await load()).activeProvider;
  return id === "credo" || id === "paystack" ? id : DEFAULT_PROVIDER;
}

/** Keys saved in the admin panel win; PAYSTACK_SECRET_KEY from the environment keeps older deployments working. */
export async function getPaystackConfig(): Promise<PaystackConfig | null> {
  const stored = (await load()).paystack;
  const dbSecret = open(stored?.secretKey);
  if (dbSecret) return { secretKey: dbSecret, publicKey: stored?.publicKey ?? "", source: "db" };
  const envSecret = env().PAYSTACK_SECRET_KEY?.trim();
  return envSecret ? { secretKey: envSecret, publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "", source: "env" } : null;
}

export async function getCredoConfig(): Promise<CredoConfig | null> {
  const s = (await load()).credo;
  const secretKey = open(s?.secretKey);
  if (!s || !secretKey || !s.publicKey || !s.businessCode) return null;
  return { environment: s.environment === "production" ? "production" : "sandbox", publicKey: s.publicKey, secretKey, businessCode: s.businessCode, webhookSignature: open(s.webhookSignature) ?? "" };
}

/** Browser-safe snapshot for the admin panel. */
export async function getProviderOverview(): Promise<ProviderOverview> {
  const [doc, paystack, credo, active] = await Promise.all([load(), getPaystackConfig(), getCredoConfig(), getActiveProviderId()]);
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const sig = open(doc.credo?.webhookSignature);
  return {
    active,
    paystack: { configured: !!paystack, source: paystack?.source ?? null, publicKey: paystack?.publicKey ?? "", secretKeyMask: maskSecret(paystack?.secretKey) },
    credo: {
      configured: !!credo, environment: credo?.environment ?? (doc.credo?.environment === "production" ? "production" : "sandbox"), publicKey: doc.credo?.publicKey ?? "", businessCode: doc.credo?.businessCode ?? "",
      secretKeyMask: maskSecret(credo?.secretKey), hasWebhookSignature: !!sig, webhookSignatureMask: maskSecret(sig),
    },
    webhookUrls: { paystack: `${base}${PROVIDER_WEBHOOK_PATHS.paystack}`, credo: `${base}${PROVIDER_WEBHOOK_PATHS.credo}` },
    encryptionReady: encryptionReady(),
    updatedAt: doc.updatedAt ?? null,
  };
}

const requireEncryption = () => { if (!encryptionReady()) throw new AppError("PROVIDER_SECRETS_KEY_MISSING"); };

export async function savePaystackConfig(input: z.infer<typeof paystackConfigSchema>, actorUid: string): Promise<void> {
  requireEncryption();
  const existing = await getPaystackConfig();
  if (!input.secretKey && !existing) throw new AppError("VALIDATION_ERROR", { secretKey: "Enter your Paystack secret key" });
  const patch: Record<string, string> = { publicKey: input.publicKey };
  if (input.secretKey) patch.secretKey = seal(input.secretKey);
  else if (existing?.source === "env") patch.secretKey = seal(existing.secretKey); // move the env key into the panel so it can be managed here
  await db().doc(PROVIDER_SETTINGS_DOC).set({ paystack: patch, updatedAt: Date.now(), updatedBy: actorUid }, { merge: true });
  invalidateProviderConfig();
  await audit({ actorUid, actorRole: "SUPER_ADMIN", action: "PAYMENT_PROVIDER_CONFIG_CHANGED", resourceType: "settings", resourceId: "paymentProviders", metadata: { provider: "paystack", secretChanged: !!input.secretKey } });
}

export async function saveCredoConfig(input: z.infer<typeof credoConfigSchema>, actorUid: string): Promise<void> {
  requireEncryption();
  const existing = (await load()).credo;
  if (!input.secretKey && !open(existing?.secretKey)) throw new AppError("VALIDATION_ERROR", { secretKey: "Enter your Credo secret key" });
  const patch: Record<string, string> = { environment: input.environment, publicKey: input.publicKey, businessCode: input.businessCode };
  if (input.secretKey) patch.secretKey = seal(input.secretKey);
  if (input.webhookSignature) patch.webhookSignature = seal(input.webhookSignature);
  else if (input.clearWebhookSignature) patch.webhookSignature = "";
  await db().doc(PROVIDER_SETTINGS_DOC).set({ credo: patch, updatedAt: Date.now(), updatedBy: actorUid }, { merge: true });
  invalidateProviderConfig();
  await audit({ actorUid, actorRole: "SUPER_ADMIN", action: "PAYMENT_PROVIDER_CONFIG_CHANGED", resourceType: "settings", resourceId: "paymentProviders", metadata: { provider: "credo", environment: input.environment, secretChanged: !!input.secretKey, signatureChanged: !!input.webhookSignature || input.clearWebhookSignature } });
}

/** Only a fully configured provider can be made active, so checkout can never be switched onto something that cannot take payment. */
export async function setActiveProvider(provider: ProviderId, actorUid: string): Promise<void> {
  const ready = provider === "credo" ? await getCredoConfig() : await getPaystackConfig();
  if (!ready) throw new AppError("PROVIDER_NOT_CONFIGURED");
  const from = await getActiveProviderId();
  await db().doc(PROVIDER_SETTINGS_DOC).set({ activeProvider: provider, updatedAt: Date.now(), updatedBy: actorUid }, { merge: true });
  invalidateProviderConfig();
  await audit({ actorUid, actorRole: "SUPER_ADMIN", action: "PAYMENT_PROVIDER_SWITCHED", resourceType: "settings", resourceId: "paymentProviders", metadata: { from, to: provider } });
}
