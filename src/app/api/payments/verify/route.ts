import { verifySchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { confirmPayment, releaseReservation, sendOrderEmail, verifyReference } from "@/lib/server/payments";
import { requireUser } from "@/lib/server/session";

/** Browser return is only a hint to check; the paid state comes exclusively from the payment provider's server API. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { reference } = verifySchema.parse(await req.json());
  const ref = (await db().doc(`References/${reference}`).get()).data();
  if (!ref || ref.userId !== user.uid) throw new AppError("NOT_FOUND");
  if (ref.status === "SUCCESSFUL") {
    await sendOrderEmail(ref.orderId).catch(() => undefined);
    return ok({ status: "SUCCESSFUL", orderId: ref.orderId });
  }
  const res = await verifyReference(reference, ref); // asks the provider that took this payment, not necessarily the active one
  if (!res || !res.ok) throw new AppError("PAYMENT_VERIFICATION_FAILED");
  const s = res.transaction.status;
  if (s === "success") {
    const out = await confirmPayment(reference, res.transaction, "verify");
    return ok({ status: "SUCCESSFUL", orderId: out.orderId });
  }
  if (s === "failed" || s === "abandoned" || s === "reversed") {
    await releaseReservation(reference, s === "failed" ? "FAILED" : "ABANDONED");
    return ok({ status: s === "failed" ? "FAILED" : "ABANDONED" });
  }
  return ok({ status: "PENDING" });
});
