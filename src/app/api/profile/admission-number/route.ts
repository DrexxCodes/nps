import { validateAdmissionNumber } from "@/lib/admission";
import { darsStudentDoc } from "@/lib/shared-user";
import { admissionNumberSchema } from "@/lib/validation/schemas";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { isPastCourse } from "@/lib/server/profile";
import { buildPublicProfileFields } from "@/lib/server/public-profile";
import { requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import type { AdmissionType } from "@/types";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { admissionNumber } = admissionNumberSchema.parse(await req.json());
  const settings = await getPlatformSettings();
  await db().runTransaction(async (tx) => {
    const userRef = db().doc(`users/${user.uid}`);
    const u = (await tx.get(userRef)).data();
    if (!u) throw new AppError("NOT_FOUND");
    if (u.admissionNumber) throw new AppError("VALIDATION_ERROR", { admissionNumber: "Your admission number is already set. Contact an administrator to change it." });
    const check = validateAdmissionNumber(admissionNumber, u.admissionType as AdmissionType);
    if (!check.ok) throw new AppError(check.code, { admissionNumber: check.code });
    if (isPastCourse(admissionNumber, settings)) throw new AppError("COURSE_DURATION_EXCEEDED", { admissionNumber: "COURSE_DURATION_EXCEEDED" });
    const idxRef = db().doc(`admissionNumbers/${admissionNumber}`);
    const studentRef = db().doc(`students/${admissionNumber}`); // DARS's per-registration-number record
    const [idx, student] = await Promise.all([tx.get(idxRef), tx.get(studentRef)]);
    if (idx.exists || student.exists) throw new AppError("ADMISSION_NUMBER_ALREADY_EXISTS", { admissionNumber: "ADMISSION_NUMBER_ALREADY_EXISTS" });
    const now = Date.now();
    tx.set(idxRef, { uid: user.uid, ...buildPublicProfileFields(u, now) });
    // `regNumber` + the students record are what DARS needs to let this account mark attendance.
    tx.set(studentRef, darsStudentDoc({ uid: user.uid, name: u.fullName, email: u.email, regNumber: admissionNumber, now }));
    tx.update(userRef, { admissionNumber, regNumber: admissionNumber, admissionStatus: "PROVIDED", updatedAt: now });
  });
  return ok({});
});
