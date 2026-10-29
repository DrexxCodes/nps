import "server-only";
import { NextResponse } from "next/server";
import type { ProviderId } from "@/constants/payment-providers";
import { audit } from "../audit";
import { db } from "../firebase-admin";
import { confirmPayment } from "../payments";
import { getProvider, providerOfReference } from "./index";

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

/**
 * One webhook pipeline for every provider.
 * 1. Authenticate with that provider's own stored keys (works even when it is not the active provider, so in-flight payments still land).
 * 2. Never trust the payload: look the reference up in our records and re-verify with the provider's API.
 * 3. 5xx / 502 on anything transient so the provider retries; 200 for events we can ignore or that can never succeed on retry.
 */
export async function handleProviderWebhook(id: ProviderId, req: Request): Promise<NextResponse> {
  const raw = await req.text();
  const provider = getProvider(id);

  let parsed;
  try { parsed = await provider.parseWebhook(raw, req.headers); } catch (e) {
    console.error("[webhook] could not read provider config", id, e instanceof Error ? e.message : "unknown");
    return json({ ok: false }, 500);
  }
  if (!parsed.valid) { console.warn("[webhook] rejected", id, parsed.reason); return json({ ok: false, code: "INVALID_WEBHOOK_SIGNATURE" }, 401); }

  const ev = parsed.event;
  if (ev.kind === "reversal") {
    await audit({ actorUid: "system", actorRole: "SYSTEM", action: "PAYMENT_TRANSFER_REVERSED", resourceType: "reference", resourceId: ev.reference ?? "unknown", metadata: { provider: id } }).catch(() => undefined);
    return json({ ok: true, ignored: true });
  }
  if (ev.kind !== "payment") return json({ ok: true, ignored: true });

  const reference = ev.reference;
  try {
    const ref = (await db().doc(`References/${reference}`).get()).data();
    if (!ref || providerOfReference(ref) !== id) return json({ ok: true, ignored: true });

    const verified = await provider.verify({ reference, providerRef: ev.providerRef ?? ref.providerRef ?? null, expectedAmountKobo: ref.amountKobo });
    if (!verified.ok) return json({ ok: false }, 502);
    if (verified.transaction.status === "pending") return json({ ok: false, pending: true }, 503); // not settled on their side yet: ask for a retry
    if (verified.transaction.status !== "success") return json({ ok: true, ignored: true });

    await confirmPayment(reference, verified.transaction, "webhook");
    return json({ ok: true });
  } catch (e) {
    const code = (e as { code?: string }).code;
    console.error("[webhook] processing failed", id, reference, e instanceof Error ? e.message : "unknown");
    if (code === "PAYMENT_VERIFICATION_FAILED") {
      await audit({ actorUid: "system", actorRole: "SYSTEM", action: "PAYMENT_MISMATCH", resourceType: "reference", resourceId: reference, metadata: { provider: id } }).catch(() => undefined);
      return json({ ok: false }, 200); // a mismatch will never succeed on retry
    }
    return json({ ok: false }, 500);
  }
}
