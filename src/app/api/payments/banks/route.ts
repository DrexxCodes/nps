import { ok, route } from "@/lib/server/errors";
import { listBanks } from "@/lib/server/paystack";
import { requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request) => {
  await requireUser(req);
  const res = await listBanks();
  return ok({ banks: (res.data ?? []).map((b) => ({ name: b.name, code: b.code })) });
});
