import { z } from "zod";
import { deleteUserSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { uidByEmail } from "@/lib/server/user-lookup";
import { requireUser } from "@/lib/server/session";
import { deleteUserAccount, previewUserDeletion } from "@/lib/server/user-deletion";

const SUPER = ["SUPER_ADMIN" as const];

/** What deleting this user would remove, and whether anything stops it. Read-only. */
export const GET = route(async (req: Request) => {
  const actor = await requireUser(req, SUPER);
  const q = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(q).success) return ok({ preview: null });
  const uid = await uidByEmail(q); // read-only lookup: unlike the role search it never creates or completes a profile
  if (!uid) return ok({ preview: null });
  return ok({ preview: await previewUserDeletion(actor, uid, q) });
});

/** Super Admin only. Permanently deletes the Auth account and the user's Firestore data. */
export const DELETE = route(async (req: Request) => {
  const actor = await requireUser(req, SUPER);
  const { email, confirmEmail, reason } = deleteUserSchema.parse(await req.json());
  if (email !== confirmEmail) throw new AppError("VALIDATION_ERROR", { confirmEmail: "That doesn't match the email you are deleting." });
  const uid = await uidByEmail(email);
  if (!uid) throw new AppError("NOT_FOUND");
  await deleteUserAccount(actor, uid, email, reason);
  return ok({});
});
