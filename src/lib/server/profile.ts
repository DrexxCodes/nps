import "server-only";
import { admissionYearOf, academicYear, exceedsCourseDuration } from "@/lib/admission";
import { micahAvatarUrl } from "@/lib/avatar";
import type { Item, PlatformSettings, PublicProfile, RequirementType } from "@/types";
import { db } from "./firebase-admin";
import { buildPublicProfileFields, type PublicProfileFields } from "./public-profile";

export type UserDoc = Record<string, any> & { id: string }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await db().doc(`users/${uid}`).get();
  return snap.exists ? ({ ...snap.data(), id: snap.id } as UserDoc) : null;
}

export function missingRequirements(user: Record<string, unknown>, item: Pick<Item, "requiredProfileFields">): RequirementType[] {
  return item.requiredProfileFields.filter((r) => {
    if (r === "PROFILE_PICTURE") return !user.profileImageUrl;
    if (r === "ADMISSION_NUMBER") return !user.admissionNumber;
    return !user.bankDetails;
  });
}

export function derivedAcademicYear(admissionNumber: string | null, s: Pick<PlatformSettings, "academicSessionStartMonth">, now = new Date()): number | null {
  const y = admissionYearOf(admissionNumber);
  return y ? academicYear(y, now, s.academicSessionStartMonth) : null;
}

export const isPastCourse = (admissionNumber: string, s: PlatformSettings, now = new Date()) =>
  exceedsCourseDuration(Number(admissionNumber.slice(0, 4)), now, s.courseDurationYears, s.academicSessionStartMonth);

/**
 * Public projection. Reads ONLY `admissionNumbers/{admissionNumber}` (kept in sync by every profile update), so it never
 * touches the user document and can never include email, phone, DOB year, emergency contacts, allergies, bank data or uid.
 */
export async function getPublicProfile(admissionNumber: string, s: PlatformSettings): Promise<PublicProfile | null> {
  if (!/^\d{10}$/.test(admissionNumber)) return null;
  const ref = db().doc(`admissionNumbers/${admissionNumber}`);
  let d = (await ref.get()).data() as (Partial<PublicProfileFields> & { uid?: string }) | undefined;
  if (!d?.uid) return null;
  if (d.syncedAt === undefined) {
    // Index document created before public fields lived here: fill it once from the user document, then it is self-contained.
    const u = await getUserDoc(d.uid);
    if (!u) return null;
    const fields = buildPublicProfileFields(u);
    await ref.set(fields, { merge: true });
    d = { ...d, ...fields };
  }
  if (d.hidden) return null;
  const birthday = d.birthday ? new Date(`2000-${d.birthday}T00:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "UTC" }) : null;
  return {
    fullName: d.fullName ?? "", admissionNumber, profileImageUrl: d.profileImageUrl ?? null,
    avatarUrl: d.profileImageUrl ?? micahAvatarUrl(d.avatarSeed ?? admissionNumber),
    academicYear: derivedAcademicYear(admissionNumber, s), bio: d.bio ?? "", birthday, socials: d.socials ?? [],
  };
}
