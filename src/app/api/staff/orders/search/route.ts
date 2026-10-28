import { z } from "zod";
import { pickupReadiness } from "@/lib/fulfilment";
import { describeVariants } from "@/lib/variants";
import { defaultAvatarUrl } from "@/lib/avatar";
import { orderSearchSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { canOperateItem, loadItems } from "@/lib/server/items";
import { derivedAcademicYear } from "@/lib/server/profile";
import { avatarSeedOf } from "@/lib/server/public-profile";
import { batchStatusFor } from "@/lib/server/queries";
import { OPS_ROLES, requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { uidByEmail } from "@/lib/server/user-lookup";

/**
 * Find a student's order by admission (reg) number, email, or order reference.
 * Returns only orders on items the caller may operate, with the minimum student info needed to hand an item over,
 * and whether the item is actually ready for pickup (a queued or processing batch is not).
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, OPS_ROLES);
  const { q } = orderSearchSchema.parse({ q: new URL(req.url).searchParams.get("q") ?? "" });
  const term = q.trim();

  let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (/^\d{10}$/.test(term)) {
    const uid = (await db().doc(`admissionNumbers/${term}`).get()).data()?.uid as string | undefined;
    if (uid) docs = (await db().collection("orders").where("userId", "==", uid).get()).docs;
  } else if (term.includes("@")) {
    if (!z.email().safeParse(term).success) throw new AppError("VALIDATION_ERROR", { q: "Enter a valid email address" });
    const uid = await uidByEmail(term);
    if (uid) docs = (await db().collection("orders").where("userId", "==", uid).get()).docs;
  } else {
    docs = (await db().collection("orders").where("reference", "==", term.toUpperCase()).get()).docs;
  }

  // 1. Items first (one batched read) so access is decided BEFORE reading anything else: nothing is fetched for orders this person can't operate.
  const sorted = docs.sort((a, b) => (b.data().paidAt ?? 0) - (a.data().paidAt ?? 0));
  const items = await loadItems(sorted.map((d) => d.data().itemId as string));
  const eligible = sorted.filter((d) => {
    const o = d.data();
    const item = items.get(o.itemId);
    return !!item && canOperateItem(user, item) && o.paymentStatus === "SUCCESSFUL" && item.physical && o.physical !== false; // physical: nothing to hand over otherwise
  });

  // 2. Everything else in parallel: settings, the student(s), and one status read per distinct batch (not per order).
  const studentIds = [...new Set(eligible.map((d) => d.data().userId as string))];
  const [settings, studentSnaps, batchStatus] = await Promise.all([
    getPlatformSettings(),
    studentIds.length ? db().getAll(...studentIds.map((id) => db().doc(`users/${id}`))) : Promise.resolve([]),
    batchStatusFor(eligible.map((d) => d.data())),
  ]);
  const students = new Map(studentSnaps.map((s) => [s.id, s.data()]));

  const results = eligible.map((d) => {
    const o = d.data();
    const item = items.get(o.itemId)!;
    const student = students.get(o.userId);
    const status = o.batchId ? (batchStatus.get(`${o.itemId}/${o.batchId}`) ?? null) : null;
    const readiness = pickupReadiness({ fulfillmentStatus: o.fulfillmentStatus, batchingEnabled: item.batchProcessingEnabled, batchNumber: o.batchNumber ?? null, batchStatus: status, batchPending: !!o.batchPending });
    return {
      orderId: d.id, reference: o.reference, itemId: o.itemId, itemName: o.itemNameSnapshot, options: describeVariants(o.selectedVariants), // e.g. "Size: M · Colour: Red": what to hand over
      studentName: (student?.fullName as string | undefined) ?? "Unknown",
      admissionNumber: (student?.admissionNumber as string | undefined) ?? null, academicYear: derivedAcademicYear((student?.admissionNumber as string | undefined) ?? null, settings),
      avatarUrl: (student?.profileImageUrl as string | undefined) ?? defaultAvatarUrl(avatarSeedOf(student?.email)),
      paymentStatus: o.paymentStatus, batchNumber: o.batchNumber ?? null, batchStatus: status, fulfillmentStatus: o.fulfillmentStatus,
      batchingEnabled: item.batchProcessingEnabled, nfcEnabled: item.nfcEnabled,
      ready: readiness.ready, notReadyReason: readiness.reason,
    };
  });
  return ok({ results });
});
