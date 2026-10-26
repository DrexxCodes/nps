import { checkoutSchema } from "@/lib/validation/schemas";
import { ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { initializeCheckout } from "@/lib/server/payments";
import { requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`pay:${user.uid}:${clientIp(req)}`, 10, 60_000);
  const result = await initializeCheckout(user, checkoutSchema.parse(await req.json()));
  return ok(result);
});
