import { ADMISSION_CODES } from "@/constants";
import type { AdmissionType } from "@/types";

/**
 * Fields DARS reads from `users/{uid}`. Every account NPS creates must carry them so the same
 * email/password also works in DARS. Shape and types mirror DARS's /api/auth/register exactly.
 */
export function darsUserFields(input: { fullName: string; regNumber: string | null }) {
  return { name: input.fullName, regNumber: input.regNumber, admin: false, scope: null, assignedCourses: [] as string[], banned: false };
}

/** DARS's `students/{regNumber}` record. Needed before attendance can be marked; DARS registration also refuses a reg number that has one. */
export function darsStudentDoc(input: { uid: string; name: string; email: string; regNumber: string; now: number }) {
  return { uid: input.uid, name: input.name, email: input.email, regNumber: input.regNumber, totalPresence: 0, createdAt: input.now };
}

/** A DARS-created account has no NPS profile yet (no `role`); it is filled in on first NPS sign-in. */
export const needsNpsProfile = (u: { role?: unknown }): boolean => u.role === undefined || u.role === null;

export function admissionTypeOf(regNumber: string | null): AdmissionType | null {
  if (!regNumber || !/^\d{10}$/.test(regNumber)) return null;
  const code = regNumber.slice(4, 7);
  return code === ADMISSION_CODES.REGULAR ? "REGULAR" : code === ADMISSION_CODES.CEP ? "CEP" : null;
}

/** Candidate usernames for an account that never chose one: email local part first, then suffixed variants, then a uid-based last resort. Always valid under `usernameSchema`. */
export function usernameCandidates(email: string, uid: string, rand: () => number = Math.random): string[] {
  let base = (email.split("@")[0] ?? "").toLowerCase().replace(/[^a-z0-9_.]/g, "").replace(/^[._]+|[._]+$/g, "").slice(0, 16);
  if (base.length < 3) base = `${base}user`.slice(0, 16);
  const out = [base];
  for (let i = 0; i < 4; i++) out.push(`${base}${Math.floor(rand() * 9000) + 1000}`.slice(0, 20));
  out.push(`u${uid.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}`);
  return [...new Set(out)];
}
