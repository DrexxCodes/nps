import { FieldValue } from "firebase-admin/firestore";
import { staffAssignSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/server/audit";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem } from "@/lib/server/items";
import { findUserByEmail } from "@/lib/server/user-lookup";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const item = await requireManageItem(user, itemId);
  const users = await Promise.all(item.assignedStaffIds.map((uid) => db().doc(`users/${uid}`).get()));
  return ok({ staff: users.filter((u) => u.exists).map((u) => ({ uid: u.id, fullName: u.data()!.fullName, email: u.data()!.email })) });
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const { email, action } = staffAssignSchema.parse(await req.json());
  await requireManageItem(user, itemId);
  const found = await findUserByEmail(email);
  if (!found) throw new AppError("NOT_FOUND", { email: "No account found with that email" });
  const { uid, data: target } = found;
  if (action === "ASSIGN" && target.role !== "STAFF") throw new AppError("VALIDATION_ERROR", { email: "This user is not a Staff member yet. Promote them in Users first." });
  const itemRef = db().doc(`items/${itemId}`);
  const batch = db().batch();
  if (action === "ASSIGN") {
    batch.update(itemRef, { assignedStaffIds: FieldValue.arrayUnion(uid), updatedAt: Date.now() });
    batch.set(db().doc(`items/${itemId}/staffAssignments/${uid}`), { staffUid: uid, assignedBy: user.uid, assignedAt: Date.now(), status: "ACTIVE" });
  } else {
    batch.update(itemRef, { assignedStaffIds: FieldValue.arrayRemove(uid), updatedAt: Date.now() });
    batch.delete(db().doc(`items/${itemId}/staffAssignments/${uid}`));
  }
  await batch.commit();
  await audit({ actorUid: user.uid, actorRole: user.role, action: action === "ASSIGN" ? "STAFF_ASSIGNED" : "STAFF_REMOVED", resourceType: "item", resourceId: itemId, metadata: { staffUid: uid } });
  return ok({});
});
