import { z } from "zod";
import { resolveRole } from "@/lib/roles";
import { roleChangeSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { findUserByEmail } from "@/lib/server/user-lookup";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

export const GET = route(async (req: Request) => {
  await requireUser(req, ADMIN_ROLES);
  const q = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(q).success) return ok({ user: null });
  const found = await findUserByEmail(q);
  const u = found?.data;
  // Effective role (NPS role + DARS admin flag). `darsAdmin` tells the UI this user's access is managed in DARS.
  return ok({ user: found && u ? { uid: found.uid, fullName: u.fullName, email: u.email ?? q, role: resolveRole(u), darsAdmin: u.admin === true } : null }); // minimum fields only
});

/** Super Admin: any role change. Admin: promote STUDENT -> STAFF only. Nobody can create a SUPER_ADMIN here. */
export const POST = route(async (req: Request) => {
  const actor = await requireUser(req, ADMIN_ROLES);
  const { email, role, reason } = roleChangeSchema.parse(await req.json());
  const uid = (await findUserByEmail(email))?.uid;
  if (!uid) throw new AppError("NOT_FOUND");
  if (uid === actor.uid) throw new AppError("FORBIDDEN");
  await db().runTransaction(async (tx) => {
    const ref = db().doc(`users/${uid}`);
    const target = (await tx.get(ref)).data();
    if (!target) throw new AppError("NOT_FOUND");
    if (target.role === "SUPER_ADMIN") throw new AppError("FORBIDDEN");
    // A DARS admin is an Admin here by definition; changing the stored NPS role would have no effect, so say so instead of pretending.
    if (target.admin === true) throw new AppError("VALIDATION_ERROR", { email: "This user is an admin in DARS, which makes them an Admin here too. Change that in DARS." });
    if (actor.role === "ADMIN" && !(role === "STAFF" && target.role === "STUDENT")) throw new AppError("FORBIDDEN");
    tx.update(ref, { role, updatedAt: Date.now() });
    tx.set(db().collection("auditLogs").doc(), { actorUid: actor.uid, actorRole: actor.role, action: "ROLE_CHANGED", resourceType: "user", resourceId: uid, reason, metadata: { from: resolveRole(target), to: role }, createdAt: Date.now() });
  });
  return ok({});
});
