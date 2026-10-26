import { itemSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/server/audit";
import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const input = itemSchema.parse(await req.json());
  const ref = db().collection("items").doc();
  const now = Date.now();
  await ref.set({ ...input, ownerAdminId: user.uid, assignedStaffIds: [], batchCount: 0, createdAt: now, updatedAt: now, suspendedAt: null, suspendedBy: null });
  await audit({ actorUid: user.uid, actorRole: user.role, action: "ITEM_CREATED", resourceType: "item", resourceId: ref.id });
  return ok({ id: ref.id }, 201);
});
