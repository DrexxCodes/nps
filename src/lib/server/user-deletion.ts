import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { resolveRole } from "@/lib/roles";
import type { Role, SessionUser } from "@/types";
import { audit } from "./audit";
import { deleteProfileImages } from "./cloudinary";
import { dobIndexPath } from "./enrollment";
import { AppError } from "./errors";
import { adminAuth, db } from "./firebase-admin";

export interface DeletionPreview {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  counts: { orders: number; transactions: number };
  /** Reasons this account cannot be deleted right now. Empty = safe to delete. */
  blockers: string[];
}

const IN_FLIGHT = ["PENDING", "INITIALIZED"];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

/** Read-only. Works even when users/{uid} is already gone (a retry after a partial failure). */
async function inspect(actor: SessionUser, uid: string, authEmail: string) {
  const [userSnap, orders, txns, ownedItem, withdrawal, refs] = await Promise.all([
    db().doc(`users/${uid}`).get(),
    db().collection("orders").where("userId", "==", uid).get(),
    db().collection("transactions").where("userId", "==", uid).get(),
    db().collection("items").where("ownerAdminId", "==", uid).limit(1).get(),
    db().collection("withdrawals").where("ownerAdminId", "==", uid).limit(1).get(),
    db().collection("References").where("userId", "==", uid).get(),
  ]);
  const user = userSnap.data() ?? null;
  const role = user ? resolveRole(user) : "STUDENT";

  // A batch slot is "reserved" while a payment is in flight. Deleting records under it would leak the slot, so wait until it settles.
  const reservationRefs = txns.docs.filter((d) => d.data().itemId && d.data().batchId).map((d) => db().doc(`items/${d.data().itemId}/reservations/${d.id}`));
  const reservations = reservationRefs.length ? await db().getAll(...reservationRefs) : [];
  const activeReservations = reservations.filter((r) => r.exists && r.data()?.status === "ACTIVE").length;

  const blockers: string[] = [];
  if (uid === actor.uid) blockers.push("You can't delete your own account.");
  if (role === "SUPER_ADMIN") blockers.push("Super Admin accounts can't be deleted.");
  if (user?.admin === true) blockers.push("This user is an admin in DARS, which shares this account. Remove them in DARS instead.");
  if (!ownedItem.empty) blockers.push("This user owns items on NPS. Those need a new owner before the account can be deleted.");
  if (!withdrawal.empty) blockers.push("This user has withdrawal records, which must be kept for the payout trail.");
  const inFlight = txns.docs.filter((d) => IN_FLIGHT.includes(d.data().status)).length;
  if (inFlight || activeReservations) blockers.push("A payment from this user is still in progress. Try again once it has been confirmed or has expired.");
  const awaiting = orders.docs.filter((d) => d.data().fulfillmentStatus === "AWAITING").length;
  if (awaiting) blockers.push(`${plural(awaiting, "paid order")} not yet delivered. Deliver or refund ${awaiting === 1 ? "it" : "them"} first.`);

  return { user, role, orders, txns, refs, blockers, email: String(user?.email ?? authEmail), fullName: String(user?.fullName ?? user?.name ?? "") };
}

export async function previewUserDeletion(actor: SessionUser, uid: string, authEmail: string): Promise<DeletionPreview> {
  const i = await inspect(actor, uid, authEmail);
  return { uid, fullName: i.fullName, email: i.email, role: i.role, counts: { orders: i.orders.size, transactions: i.txns.size }, blockers: i.blockers };
}

/**
 * Permanently removes a user. Order matters so a failure part-way can simply be retried:
 *  1. disable sign-in and revoke sessions (they are locked out immediately),
 *  2. wipe Firestore + their photos,
 *  3. delete the Auth record LAST, because the email lookup used to find them lives in Auth.
 * financialLedger and sales totals carry no user identity and are deliberately left alone.
 */
export async function deleteUserAccount(actor: SessionUser, uid: string, authEmail: string, reason: string): Promise<void> {
  const i = await inspect(actor, uid, authEmail);
  if (i.blockers.length) throw new AppError("FORBIDDEN", undefined, i.blockers[0]);
  const auth = adminAuth();
  const u = i.user ?? {};

  await auth.updateUser(uid, { disabled: true }).catch((e: { code?: string }) => { if (e.code !== "auth/user-not-found") throw e; });
  await auth.revokeRefreshTokens(uid).catch(() => undefined);

  // Indexes that point at this user: only removed when they still point at THIS user (never someone else's).
  const username = typeof u.usernameNormalized === "string" ? u.usernameNormalized : null;
  const regNumbers = [...new Set([u.admissionNumber, u.regNumber].filter((v): v is string => typeof v === "string" && /^\d{10}$/.test(v)))];
  const owned = async (path: string) => { const s = await db().doc(path).get(); return s.exists && s.data()?.uid === uid; };
  const paths: string[] = [];
  if (username && (await owned(`usernames/${username}`))) paths.push(`usernames/${username}`);
  for (const r of regNumbers) {
    if (await owned(`admissionNumbers/${r}`)) paths.push(`admissionNumbers/${r}`);
    if (await owned(`students/${r}`)) paths.push(`students/${r}`);
  }
  if (typeof u.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(u.dateOfBirth)) paths.push(dobIndexPath(u.dateOfBirth, uid));

  // Purchases: orders, transactions, payment references and the batch reservation each one made.
  i.orders.docs.forEach((d) => paths.push(d.ref.path));
  i.refs.docs.forEach((d) => paths.push(d.ref.path));
  i.txns.docs.forEach((d) => {
    paths.push(d.ref.path);
    if (d.data().itemId) paths.push(`items/${d.data().itemId}/reservations/${d.id}`);
  });

  const writer = db().bulkWriter();
  const ops: Promise<unknown>[] = paths.map((p) => writer.delete(db().doc(p)));
  // Staff are listed on items they operate; drop them from those lists.
  const assigned = await db().collection("items").where("assignedStaffIds", "array-contains", uid).get();
  assigned.docs.forEach((d) => ops.push(writer.update(d.ref, { assignedStaffIds: FieldValue.arrayRemove(uid) })));
  await writer.close();
  await Promise.all(ops);

  await db().recursiveDelete(db().doc(`users/${uid}`)); // the profile and anything nested under it

  const imagesRemoved = await deleteProfileImages(uid).then(() => true, () => false); // best effort: never blocks the deletion

  await auth.deleteUser(uid).catch((e: { code?: string }) => { if (e.code !== "auth/user-not-found") throw e; });

  // Kept forever as the record that this happened. The email is masked on purpose: the point of deleting is to not keep it.
  await audit({
    actorUid: actor.uid, actorRole: actor.role, action: "USER_DELETED", resourceType: "user", resourceId: uid, reason,
    metadata: { email: maskEmail(i.email), role: i.role, orders: i.orders.size, transactions: i.txns.size, imagesRemoved },
  });
}
