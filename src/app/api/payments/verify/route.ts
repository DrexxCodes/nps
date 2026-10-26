import { verifySchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { confirmPayment, releaseReservation, sendOrderEmail } from "@/lib/server/payments";
import { verifyTransaction } from "@/lib/server/paystack";
import { requireUser } from "@/lib/server/session";

/** Browser return is only a hint to check; the paid state comes exclusively from Paystack's server API. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { reference } = verifySchema.parse(await req.json());
  const ref = (await db().doc(`References/${reference}`).get()).data();
  if (!ref || ref.userId !== user.uid) throw new AppError("NOT_FOUND");
  if (ref.status === "SUCCESSFUL") {
    await sendOrderEmail(ref.orderId).catch(() => undefined);
    return ok({ status: "SUCCESSFUL", orderId: ref.orderId });
  }
  const res = await verifyTransaction(reference);
  if (!res.status) throw new AppError("PAYMENT_VERIFICATION_FAILED");
  const s = res.data.status;
  if (s === "success") {
    const out = await confirmPayment(reference, res.data, "verify");
    return ok({ status: "SUCCESSFUL", orderId: out.orderId });
  }
  if (s === "failed" || s === "abandoned" || s === "reversed") {
    await releaseReservation(reference, s === "failed" ? "FAILED" : "ABANDONED");
    return ok({ status: s === "failed" ? "FAILED" : "ABANDONED" });
  }
  return ok({ status: "PENDING" });
});
