import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { normalizePhone, normalizeUsername, validateAdmissionNumber } from "@/lib/admission";
import { darsStudentDoc, darsUserFields } from "@/lib/shared-user";
import type { EnrollmentInput } from "@/lib/validation/schemas";
import { adminAuth, db } from "./firebase-admin";
import { AppError } from "./errors";
import { getPlatformSettings } from "./settings";
import { isPastCourse } from "./profile";
import { buildPublicProfileFields } from "./public-profile";

/** Firestore doc ids may not contain "/" — month/day indexes are zero-padded numerics. */
export const dobIndexPath = (dob: string, uid: string) => `DOB/${dob.slice(5, 7)}/days/${dob.slice(8, 10)}/students/${uid}`;

export async function enrollStudent(input: EnrollmentInput): Promise<{ uid: string }> {
  const settings = await getPlatformSettings();
  if (!settings.enrollmentOpen) throw new AppError("ENROLLMENT_CLOSED");

  const phone = normalizePhone(input.phone);
  if (!phone) throw new AppError("VALIDATION_ERROR", { phone: "Enter a valid Nigerian phone number" });

  let admissionNumber: string | null = null;
  if (!input.noAdmissionNumber && input.admissionNumber) {
    const check = validateAdmissionNumber(input.admissionNumber, input.admissionType);
    if (!check.ok) throw new AppError(check.code, { admissionNumber: check.code });
    if (isPastCourse(input.admissionNumber, settings)) throw new AppError("COURSE_DURATION_EXCEEDED", { admissionNumber: "COURSE_DURATION_EXCEEDED" });
    admissionNumber = input.admissionNumber;
  }

  const usernameNormalized = normalizeUsername(input.username);
  const auth = adminAuth();
  let uid: string;
  try {
    const created = await auth.createUser({ email: input.email, password: input.password, displayName: input.fullName, emailVerified: false });
    uid = created.uid;
  } catch (e) {
    if ((e as { code?: string }).code === "auth/email-already-exists") throw new AppError("VALIDATION_ERROR", { email: "An account with this email already exists" });
    throw e;
  }

  try {
    await db().runTransaction(async (tx) => {
      const userNameRef = db().doc(`usernames/${usernameNormalized}`);
      const admRef = admissionNumber ? db().doc(`admissionNumbers/${admissionNumber}`) : null;
      // DARS keeps its own record per registration number; a number already registered there (without ever signing up here) must not be claimed again.
      const studentRef = admissionNumber ? db().doc(`students/${admissionNumber}`) : null;
      const [uSnap, aSnap, sSnap] = await Promise.all([tx.get(userNameRef), admRef ? tx.get(admRef) : Promise.resolve(null), studentRef ? tx.get(studentRef) : Promise.resolve(null)]);
      if (uSnap.exists) throw new AppError("USERNAME_TAKEN", { username: "USERNAME_TAKEN" });
      if (aSnap?.exists || sSnap?.exists) throw new AppError("ADMISSION_NUMBER_ALREADY_EXISTS", { admissionNumber: "ADMISSION_NUMBER_ALREADY_EXISTS" });

      const now = Date.now();
      tx.set(userNameRef, { uid });
      if (admRef) tx.set(admRef, { uid, ...buildPublicProfileFields({ fullName: input.fullName, email: input.email, accountStatus: "ACTIVE" }, now) });
      if (studentRef && admissionNumber) tx.set(studentRef, darsStudentDoc({ uid, name: input.fullName, email: input.email, regNumber: admissionNumber, now }));
      tx.set(db().doc(`users/${uid}`), {
        ...darsUserFields({ fullName: input.fullName, regNumber: admissionNumber }), // so the same account signs in to DARS
        uid, role: "STUDENT", fullName: input.fullName, username: input.username, usernameNormalized, email: input.email, phone,
        admissionType: input.admissionType, admissionNumber, admissionStatus: admissionNumber ? "PROVIDED" : "AWAITING",
        dateOfBirth: input.dateOfBirth, profileImageUrl: null, cloudinaryPublicId: null, bio: "", socialLinks: {}, activeSocialLinks: [],
        birthdayVisibility: false, emergencyContacts: [], allergies: "", stateOfOrigin: null, localGovernmentArea: null, bankDetails: null,
        emailVerified: false, accountStatus: "ACTIVE", createdAt: now, updatedAt: now,
      });
      tx.set(db().doc(dobIndexPath(input.dateOfBirth, uid)), {
        uid, name: input.fullName, email: input.email, month: input.dateOfBirth.slice(5, 7), day: input.dateOfBirth.slice(8, 10), lastBirthdayEmailYear: null,
      });
      tx.set(db().doc(`auditLogs/enroll_${uid}`), { actorUid: uid, actorRole: "STUDENT", action: "ENROLLED", resourceType: "user", resourceId: uid, reason: null, metadata: { admissionType: input.admissionType }, createdAt: FieldValue.serverTimestamp() });
    });
  } catch (e) {
    await auth.deleteUser(uid).catch(() => undefined); // roll back the orphaned Auth user
    throw e;
  }
  return { uid };
}
