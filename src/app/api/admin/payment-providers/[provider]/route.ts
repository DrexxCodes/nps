import { credoConfigSchema, paystackConfigSchema } from "@/lib/validation/provider-schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { isProviderId } from "@/lib/server/providers";
import { getProviderOverview, saveCredoConfig, savePaystackConfig } from "@/lib/server/providers/config";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";

/** Saves one provider's keys. Blank secret fields keep what is already stored. */
export const PUT = route(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser(req, ["SUPER_ADMIN"]);
  rateLimit(`provider-config:${user.uid}`, 20, 60_000);
  const { provider } = await ctx.params;
  if (!isProviderId(provider)) throw new AppError("NOT_FOUND");
  const body = await req.json();
  if (provider === "credo") await saveCredoConfig(credoConfigSchema.parse(body), user.uid);
  else await savePaystackConfig(paystackConfigSchema.parse(body), user.uid);
  return ok({ overview: await getProviderOverview() });
});
