import { NextResponse } from "next/server";
import { isProviderId } from "@/lib/server/providers";
import { handleProviderWebhook } from "@/lib/server/providers/webhook";

export const runtime = "nodejs";

/** /api/payments/webhook/credo (and /paystack). Each provider is authenticated with its own stored keys. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProviderId(provider)) return NextResponse.json({ ok: false }, { status: 404 });
  return handleProviderWebhook(provider, req);
}
