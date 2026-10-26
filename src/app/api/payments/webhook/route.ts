import { NextResponse } from "next/server";
import { audit } from "@/lib/server/audit";
import { db } from "@/lib/server/firebase-admin";
import { confirmPayment } from "@/lib/server/payments";
import { validSignature, verifyTransaction } from "@/lib/server/paystack";

export const runtime = "nodejs";

/** Signature is checked against the exact raw body. 5xx on transient failure so Paystack retries; 200 for ignorable events. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return NextResponse.json({ ok: false, code: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });

  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({ ok: true, ignored: true });

  const reference = event.data.reference;
  try {
    const known = await db().doc(`References/${reference}`).get();
    if (!known.exists) return NextResponse.json({ ok: true, ignored: true });
    const verified = await verifyTransaction(reference);
    if (!verified.status) return NextResponse.json({ ok: false }, { status: 502 });
    await confirmPayment(reference, verified.data, "webhook");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = (e as { code?: string }).code;
    console.error("[webhook] processing failed", reference, e instanceof Error ? e.message : "unknown");
    if (code === "PAYMENT_VERIFICATION_FAILED") {
      await audit({ actorUid: "system", actorRole: "SYSTEM", action: "PAYMENT_MISMATCH", resourceType: "reference", resourceId: reference }).catch(() => undefined);
      return NextResponse.json({ ok: false }, { status: 200 }); // a mismatch will never succeed on retry
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
