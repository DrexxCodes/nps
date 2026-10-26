import "server-only";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { RESERVATION_TTL_MS } from "@/constants";
import { isPurchasable } from "@/lib/item-status";
import { computePricing, formatNaira, selectSubItems, snapshotFees } from "@/lib/money";
import { toStudentItem } from "@/lib/pricing";
import { generateReference } from "@/lib/reference";
import { validateVariantSelection, type VariantSelection } from "@/lib/variants";
import type { PaymentStatus, Pricing, SessionUser, SubItem } from "@/types";
import { db } from "./firebase-admin";
import { AppError } from "./errors";
import { env } from "./env";
import { auditInTx, audit } from "./audit";
import { loadItem, toItem } from "./items";
import { derivedAcademicYear, getUserDoc, missingRequirements } from "./profile";
import { getPlatformSettings } from "./settings";
import { recordSale } from "./stats";
import { initializeTransaction, verifyTransaction, type PaystackTransaction } from "./paystack";
import { paymentEmail, sendEmail } from "./email";

const hist = (status: PaymentStatus) => FieldValue.arrayUnion({ status, at: Date.now() });

/**
 * Server-side price quote. Used by checkout preview and initialization so both always agree.
 * Prices are resolved for the buyer's class (derived from their admission number); `chosen` carries the prices they will
 * pay and no class overrides, so it is safe to snapshot onto the transaction and order.
 */
export async function quote(itemId: string, subItemIds: string[], admissionNumber: string | null = null): Promise<{ pricing: Pricing; chosen: SubItem[]; classYear: number | null }> {
  const [loaded, settings] = await Promise.all([loadItem(itemId), getPlatformSettings()]);
  const classYear = derivedAcademicYear(admissionNumber, settings);
  const item = toStudentItem(loaded, classYear);
  let chosen: SubItem[] = [];
  let subtotal = item.basePriceKobo;
  if (item.hasSubItems) {
    const sel = selectSubItems(item.subItems, subItemIds);
    if (!sel.ok) throw new AppError("VALIDATION_ERROR", { subItemIds: "Select valid options for this item" });
    chosen = sel.chosen;
    subtotal = chosen.reduce((n, s) => n + s.priceKobo, 0);
  }
  if (subtotal <= 0) throw new AppError("ITEM_NOT_AVAILABLE");
  return { pricing: computePricing(subtotal, snapshotFees(settings)), chosen, classYear };
}

export async function initializeCheckout(user: SessionUser, input: { itemId: string; subItemIds: string[]; variants?: VariantSelection }) {
  const profile = await getUserDoc(user.uid);
  if (!profile || profile.accountStatus !== "ACTIVE" || profile.banned === true) throw new AppError("FORBIDDEN");
  const item = await loadItem(input.itemId);
  if (!isPurchasable(item)) throw new AppError("ITEM_NOT_AVAILABLE");
  const missing = missingRequirements(profile, item);
  if (missing.length) throw new AppError("PROFILE_REQUIREMENTS_MISSING", { missing: missing.join(",") });

  const variantCheck = validateVariantSelection(item.variantSets, input.variants ?? {});
  if (!variantCheck.ok) throw new AppError("VALIDATION_ERROR", { variants: Object.values(variantCheck.errors)[0] ?? "Check your selections" });

  const { pricing, chosen, classYear } = await quote(item.id, input.subItemIds, profile.admissionNumber ?? null);
  if (item.batchProcessingEnabled) await reconcileExpired(item.id);

  const orderId = db().collection("orders").doc().id;
  let reference = "";
  const placed: { batchNumber: number | null } = { batchNumber: null };

  for (let attempt = 0; attempt < 3; attempt++) {
    reference = generateReference();
    const result = await db().runTransaction(async (tx) => {
      const refDoc = db().doc(`References/${reference}`);
      const itemRef = db().doc(`items/${item.id}`);
      const [refSnap, itemSnap, batchesSnap] = await Promise.all([
        tx.get(refDoc), tx.get(itemRef),
        item.batchProcessingEnabled ? tx.get(db().collection(`items/${item.id}/batches`).orderBy("batchNumber")) : Promise.resolve(null),
      ]);
      if (refSnap.exists) return "COLLISION" as const;
      const fresh = toItem(itemSnap);
      if (!isPurchasable(fresh)) throw new AppError("ITEM_NOT_AVAILABLE");

      let bId: string | null = null;
      let bNum: number | null = null;
      if (fresh.batchProcessingEnabled && batchesSnap) {
        const open = batchesSnap.docs.find((b) => { const d = b.data(); return d.status === "QUEUED" && d.paidCount + d.reservedCount < d.maxOrders; });
        if (open) {
          bId = open.id; bNum = open.data().batchNumber;
          tx.update(open.ref, { reservedCount: FieldValue.increment(1), updatedAt: Date.now() });
        } else {
          const count: number = itemSnap.data()?.batchCount ?? batchesSnap.size;
          if (fresh.batchLimitEnabled && count >= fresh.maxBatches) throw new AppError("NO_MORE_BATCHES");
          const nb = db().collection(`items/${item.id}/batches`).doc();
          bId = nb.id; bNum = count + 1;
          tx.set(nb, { batchNumber: bNum, status: "QUEUED", maxOrders: fresh.batchSize, reservedCount: 1, paidCount: 0, createdAt: Date.now(), updatedAt: Date.now(), statusChangedAt: null, statusChangedBy: null, sizeChangedAt: null, sizeChangedBy: null });
          tx.update(itemRef, { batchCount: count + 1 });
        }
        tx.set(db().doc(`items/${item.id}/reservations/${reference}`), { batchId: bId, userId: user.uid, status: "ACTIVE", createdAt: Date.now(), expiresAt: Date.now() + RESERVATION_TTL_MS });
      }

      const now = Date.now();
      const base = {
        reference, userId: user.uid, itemId: item.id, orderId, amountKobo: pricing.totalKobo, currency: "NGN", status: "PENDING" as PaymentStatus,
        paystackTransactionId: null, createdAt: now, updatedAt: now, verifiedAt: null, statusHistory: [{ status: "PENDING", at: now }],
      };
      tx.set(refDoc, { ...base, webhookProcessedAt: null });
      tx.set(db().doc(`transactions/${reference}`), {
        ...base, ownerAdminId: item.ownerAdminId, itemNameSnapshot: item.name, selectedSubItems: chosen, selectedVariants: variantCheck.chosen, classYear, batchId: bId, batchNumber: bNum,
        subtotalKobo: pricing.subtotalKobo, platformFeeKobo: pricing.platformFeeKobo, otherFeesKobo: pricing.otherFeesKobo, feeSnapshot: pricing.feeSnapshot,
      });
      placed.batchNumber = bNum;
      return "OK" as const;
    });
    if (result === "OK") break;
    if (attempt === 2) throw new AppError("PAYMENT_INITIALIZATION_FAILED");
  }

  try {
    const res = await initializeTransaction({
      email: profile.email, amountKobo: pricing.totalKobo, reference,
      callbackUrl: `${env().NEXT_PUBLIC_APP_URL}/dashboard/orders?reference=${reference}`, metadata: { userId: user.uid, itemId: item.id },
    });
    // Paystack's own message says exactly why (e.g. "Invalid key", "Invalid Amount Sent", "Invalid callback url"): keep it in the log.
    if (!res.status) throw new Error(`Paystack rejected initialization (HTTP ${res.httpStatus}): ${res.message}`);
    await Promise.all(["References", "transactions"].map((c) => db().doc(`${c}/${reference}`).update({ status: "INITIALIZED", updatedAt: Date.now(), statusHistory: hist("INITIALIZED") })));
    return { reference, authorizationUrl: res.data.authorization_url, pricing, batchNumber: placed.batchNumber };
  } catch (e) {
    console.error("[payments] initialize failed", reference, e instanceof Error ? e.message : "unknown", { amountKobo: pricing.totalKobo, callbackUrl: `${env().NEXT_PUBLIC_APP_URL}/dashboard/orders` });
    await releaseReservation(reference, "FAILED");
    throw new AppError("PAYMENT_INITIALIZATION_FAILED");
  }
}

/** Marks a non-successful reference terminal and frees its batch slot. SUCCESSFUL references are never touched. */
export async function releaseReservation(reference: string, final: "FAILED" | "ABANDONED"): Promise<void> {
  await db().runTransaction(async (tx) => {
    const refDoc = db().doc(`References/${reference}`);
    const refSnap = await tx.get(refDoc);
    const r = refSnap.data();
    if (!r || r.status === "SUCCESSFUL" || r.status === final) return;
    const resRef = db().doc(`items/${r.itemId}/reservations/${reference}`);
    const resSnap = await tx.get(resRef);
    const batchRef = resSnap.data()?.batchId ? db().doc(`items/${r.itemId}/batches/${resSnap.data()!.batchId}`) : null;
    const batchSnap = batchRef ? await tx.get(batchRef) : null;
    if (resSnap.data()?.status === "ACTIVE" && batchRef && batchSnap?.exists) {
      tx.update(batchRef, { reservedCount: FieldValue.increment(-1), updatedAt: Date.now() });
      tx.update(resRef, { status: "RELEASED", releasedAt: Date.now() });
    }
    for (const c of ["References", "transactions"]) tx.update(db().doc(`${c}/${reference}`), { status: final, updatedAt: Date.now(), statusHistory: hist(final) });
  });
}

/** Releases expired reservations only after Paystack confirms they were not paid. Ambiguous cases keep their slot. */
export async function reconcileExpired(itemId: string): Promise<void> {
  const snap = await db().collection(`items/${itemId}/reservations`).where("status", "==", "ACTIVE").limit(50).get();
  const expired = snap.docs.filter((d) => d.data().expiresAt < Date.now()).slice(0, 25);
  for (const d of expired) {
    try {
      const res = await verifyTransaction(d.id);
      if (res.status && res.data.status === "success") await confirmPayment(d.id, res.data, "verify");
      else if (res.status && ["abandoned", "failed", "reversed"].includes(res.data.status)) await releaseReservation(d.id, res.data.status === "failed" ? "FAILED" : "ABANDONED");
      else if (!res.status && /not found/i.test(res.message)) await releaseReservation(d.id, "ABANDONED");
    } catch (e) {
      console.error("[payments] reconcile skipped", d.id, e instanceof Error ? e.message : "unknown");
    }
  }
}

/** Idempotent. Safe to call from verify, webhook and reconciliation concurrently. */
export async function confirmPayment(reference: string, pt: PaystackTransaction, source: "verify" | "webhook"): Promise<{ orderId: string; alreadyProcessed: boolean }> {
  if (pt.status !== "success" || pt.reference !== reference) throw new AppError("PAYMENT_VERIFICATION_FAILED");

  const outcome = await db().runTransaction(async (tx) => {
    const refDoc = db().doc(`References/${reference}`);
    const txnDoc = db().doc(`transactions/${reference}`);
    const [refSnap, txnSnap] = await Promise.all([tx.get(refDoc), tx.get(txnDoc)]);
    const r = refSnap.data();
    const t = txnSnap.data();
    if (!r || !t) throw new AppError("NOT_FOUND");
    if (r.status === "SUCCESSFUL") {
      if (source === "webhook") tx.update(refDoc, { webhookProcessedAt: Date.now() });
      return { orderId: r.orderId as string, already: true as const };
    }
    const md = pt.metadata;
    if (pt.amount !== t.amountKobo || pt.currency !== t.currency || (md?.userId && md.userId !== t.userId) || (md?.itemId && md.itemId !== t.itemId)) {
      throw new AppError("PAYMENT_VERIFICATION_FAILED");
    }

    let batchId: string | null = t.batchId ?? null;
    let batchNumber: number | null = t.batchNumber ?? null;
    let batchPending = false;
    if (batchId) {
      const resRef = db().doc(`items/${t.itemId}/reservations/${reference}`);
      const batchRef = db().doc(`items/${t.itemId}/batches/${batchId}`);
      const [resSnap, batchSnap] = await Promise.all([tx.get(resRef), tx.get(batchRef)]);
      const b = batchSnap.data();
      if (resSnap.data()?.status === "ACTIVE" && b) {
        tx.update(batchRef, { reservedCount: FieldValue.increment(-1), paidCount: FieldValue.increment(1), updatedAt: Date.now() });
        tx.update(resRef, { status: "CONFIRMED" });
      } else if (b && b.status === "QUEUED" && b.paidCount + b.reservedCount < b.maxOrders) {
        // Late payment after the slot was released: re-take capacity if it still exists.
        tx.update(batchRef, { paidCount: FieldValue.increment(1), updatedAt: Date.now() });
        tx.set(resRef, { status: "CONFIRMED", lateConfirmedAt: Date.now() }, { merge: true });
      } else {
        batchId = null; batchNumber = null; batchPending = true; // paid order is kept; admin must place it in a batch
      }
    }

    const now = Date.now();
    tx.set(db().doc(`orders/${t.orderId}`), {
      userId: t.userId, itemId: t.itemId, itemOwnerId: t.ownerAdminId, reference, selectedSubItems: t.selectedSubItems, selectedVariants: t.selectedVariants ?? [], classYear: t.classYear ?? null, itemNameSnapshot: t.itemNameSnapshot,
      subtotal: t.subtotalKobo, platformFee: t.platformFeeKobo, otherFees: t.otherFeesKobo, totalAmount: t.amountKobo, currency: t.currency,
      paymentStatus: "SUCCESSFUL", fulfillmentStatus: "AWAITING", batchId, batchNumber, batchPending, emailStatus: "PENDING",
      createdAt: t.createdAt, paidAt: now, deliveredAt: null, deliveredBy: null, updatedAt: now,
    });
    const ledger = (suffix: string, e: Record<string, unknown>) => tx.set(db().doc(`financialLedger/${reference}_${suffix}`), { eventType: suffix, orderId: t.orderId, withdrawalId: null, currency: t.currency, status: "CONFIRMED", reference, createdAt: now, itemId: t.itemId, ...e });
    ledger("PAYMENT", { ownerAdminId: t.ownerAdminId, amountKobo: t.subtotalKobo, direction: "CREDIT" });
    if (t.platformFeeKobo > 0) ledger("PLATFORM_FEE", { ownerAdminId: null, amountKobo: t.platformFeeKobo, direction: "CREDIT" });
    if (pt.fees && pt.fees > 0) ledger("PROCESSOR_FEE", { ownerAdminId: null, amountKobo: pt.fees, direction: "DEBIT" });

    recordSale(tx, t.ownerAdminId, t.subtotalKobo); // same transaction as the order: exactly once, however many times verify/webhook/reconcile run

    const patch = { status: "SUCCESSFUL" as PaymentStatus, paystackTransactionId: String(pt.id), verifiedAt: now, updatedAt: now, statusHistory: hist("SUCCESSFUL") };
    tx.update(refDoc, { ...patch, ...(source === "webhook" ? { webhookProcessedAt: now } : {}) });
    tx.update(txnDoc, { ...patch, batchId, batchNumber });
    if (batchPending) auditInTx(tx, { actorUid: "system", actorRole: "SYSTEM", action: "PAID_ORDER_NEEDS_BATCH", resourceType: "order", resourceId: t.orderId, metadata: { itemId: t.itemId } });
    return { orderId: t.orderId as string, already: false as const };
  });

  await sendOrderEmail(outcome.orderId).catch((e) => console.error("[payments] email failed", outcome.orderId, e instanceof Error ? e.message : "unknown"));
  return { orderId: outcome.orderId, alreadyProcessed: outcome.already };
}

/** Retryable: only sends when the order has not been emailed yet. Never touches payment state. */
export async function sendOrderEmail(orderId: string): Promise<void> {
  const orderRef: DocumentReference = db().doc(`orders/${orderId}`);
  const order = (await orderRef.get()).data();
  if (!order || order.emailStatus === "SENT" || order.emailStatus === "PREVIEWED") return;
  const user = await getUserDoc(order.userId);
  if (!user) return;
  try {
    const status = await sendEmail(paymentEmail({ name: user.fullName, to: user.email, item: order.itemNameSnapshot, reference: order.reference, amount: formatNaira(order.totalAmount) }));
    await orderRef.update({ emailStatus: status, emailSentAt: Date.now() });
  } catch (e) {
    await orderRef.update({ emailStatus: "FAILED" });
    await audit({ actorUid: "system", actorRole: "SYSTEM", action: "ORDER_EMAIL_FAILED", resourceType: "order", resourceId: orderId });
    throw e;
  }
}
