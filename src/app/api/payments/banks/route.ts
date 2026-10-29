import { ok, route } from "@/lib/server/errors";
import { getBanks } from "@/lib/server/banks";
import { requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request) => {
  await requireUser(req);
  return ok({ banks: await getBanks() });
});
