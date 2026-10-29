export const PROVIDER_IDS = ["paystack", "credo"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Records created before providers existed carry no `provider` field; they were all Paystack. */
export const DEFAULT_PROVIDER: ProviderId = "paystack";

export const PROVIDER_LABELS: Record<ProviderId, string> = { paystack: "Paystack", credo: "Credo" };

export const CREDO_ENVIRONMENTS = ["sandbox", "production"] as const;
export const CREDO_BASE_URLS = { sandbox: "https://api.credodemo.com", production: "https://api.credocentral.com" } as const;
export const CREDO_ENVIRONMENT_LABELS = { sandbox: "Sandbox (test money)", production: "Production (real money)" } as const;

/** Each provider posts to its own URL, so a webhook is always checked against the right keys even while another provider is active. */
export const PROVIDER_WEBHOOK_PATHS: Record<ProviderId, string> = { paystack: "/api/payments/webhook", credo: "/api/payments/webhook/credo" };

export const PROVIDER_SETTINGS_DOC = "settings/paymentProviders";
/** Per-instance cache of the provider settings document. Keeps the checkout and webhook hot paths to zero extra reads. */
export const PROVIDER_CONFIG_CACHE_MS = 15_000;
export const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;
