import { z } from "zod";
import { pickupReadiness } from "@/lib/fulfilment";
import { describeVariants } from "@/lib/variants";
import { micahAvatarUrl } from "@/lib/avatar";
import { orderSearchSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { canOperateItem, loadItem } from "@/lib/server/items";
import { derivedAcademicYear, getUserDoc } from "@/lib/server/profile";
import { avatarSeedOf } from "@/lib/server/public-profile";
import { OPS_ROLES, requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { uidByEmail } from "@/lib/server/user-lookup";
import type { Item } from "@/types";

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

  const settings = await getPlatformSettings();
  const items = new Map<string, Item | null>();
  const students = new Map<string, Awaited<ReturnType<typeof getUserDoc>>>();
  const results = [];
  for (const d of docs.sort((a, b) => (b.data().paidAt ?? 0) - (a.data().paidAt ?? 0))) {
    const o = d.data();
    if (!items.has(o.itemId)) items.set(o.itemId, await loadItem(o.itemId).catch(() => null));
    const item = items.get(o.itemId);
    if (!item || !canOperateItem(user, item) || o.paymentStatus !== "SUCCESSFUL") continue;
    if (!students.has(o.userId)) students.set(o.userId, await getUserDoc(o.userId));
    const student = students.get(o.userId);
    const batch = o.batchId ? (await db().doc(`items/${o.itemId}/batches/${o.batchId}`).get()).data() : null;
    const readiness = pickupReadiness({ fulfillmentStatus: o.fulfillmentStatus, batchingEnabled: item.batchProcessingEnabled, batchNumber: o.batchNumber ?? null, batchStatus: batch?.status ?? null, batchPending: !!o.batchPending });
    results.push({
      orderId: d.id, reference: o.reference, itemId: o.itemId, itemName: o.itemNameSnapshot, options: describeVariants(o.selectedVariants), // e.g. "Size: M · Colour: Red": what to hand over
      studentName: student?.fullName ?? "Unknown",
      admissionNumber: student?.admissionNumber ?? null, academicYear: derivedAcademicYear(student?.admissionNumber ?? null, settings),
      avatarUrl: student?.profileImageUrl ?? micahAvatarUrl(avatarSeedOf(student?.email)),
      paymentStatus: o.paymentStatus, batchNumber: o.batchNumber ?? null, batchStatus: batch?.status ?? null, fulfillmentStatus: o.fulfillmentStatus,
      batchingEnabled: item.batchProcessingEnabled, nfcEnabled: item.nfcEnabled,
      ready: readiness.ready, notReadyReason: readiness.reason,
    });
  }
  return ok({ results });
});
