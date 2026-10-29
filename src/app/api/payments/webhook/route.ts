import { handleProviderWebhook } from "@/lib/server/providers/webhook";

export const runtime = "nodejs";

/** Original Paystack webhook URL, kept so the existing dashboard setting keeps working. */
export const POST = (req: Request) => handleProviderWebhook("paystack", req);
