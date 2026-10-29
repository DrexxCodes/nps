import { ok, route } from "@/lib/server/errors";
import { getProviderOverview } from "@/lib/server/providers/config";
import { requireUser } from "@/lib/server/session";

/** Super Admin only. Returns masked keys, never secrets. */
export const GET = route(async (req: Request) => {
  await requireUser(req, ["SUPER_ADMIN"]);
  return ok({ overview: await getProviderOverview() });
});
