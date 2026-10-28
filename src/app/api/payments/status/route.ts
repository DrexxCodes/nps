import { verifySchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireUser } from "@/lib/server/session";

/**
 * Cheap status check for the receipt page: reads only our own `References` record (no Paystack call).
 * The webhook or the verify route moves it to SUCCESSFUL; the receipt page falls back to verify after a few seconds.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const { reference } = verifySchema.parse({ reference: new URL(req.url).searchParams.get("reference") });
  const ref = (await db().doc(`References/${reference}`).get()).data();
  if (!ref || ref.userId !== user.uid) throw new AppError("NOT_FOUND");
  return ok({ status: ref.status as string, orderId: ref.status === "SUCCESSFUL" ? (ref.orderId as string) : null });
});
