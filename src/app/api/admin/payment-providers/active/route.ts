import { activeProviderSchema } from "@/lib/validation/provider-schemas";
import { ok, route } from "@/lib/server/errors";
import { getProviderOverview, setActiveProvider } from "@/lib/server/providers/config";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";

/**
 * Switches which provider takes NEW payments. Takes effect immediately on this instance and within ~15 s everywhere.
 * Payments already started keep using the provider they began with.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req, ["SUPER_ADMIN"]);
  rateLimit(`provider-switch:${user.uid}`, 10, 60_000);
  const { provider } = activeProviderSchema.parse(await req.json());
  await setActiveProvider(provider, user.uid);
  return ok({ overview: await getProviderOverview() });
});
