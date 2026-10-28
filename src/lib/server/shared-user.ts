import "server-only";
import { normalizeUsername } from "@/lib/admission";
import { admissionTypeOf, needsAdmissionLink, needsNpsProfile, usernameCandidates } from "@/lib/shared-user";
import { adminAuth, db } from "./firebase-admin";
import { buildPublicProfileFields } from "./public-profile";

export type UserData = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Completes the NPS side of a user document that DARS created (DARS only writes uid/email/name/regNumber/admin/scope/
 * assignedCourses/banned/createdAt). Additive and idempotent: existing fields are never changed, and the stored NPS
 * role is always STUDENT (a DARS admin gets Admin access through `resolveRole`, so a later demotion in DARS still works).
 * Username/phone/DOB were never collected in DARS: the username is generated, phone and DOB stay null until the student adds them.
 */
export async function adoptDarsUser(uid: string): Promise<UserData | null> {
  const ref = db().doc(`users/${uid}`);
  const authUser = await adminAuth().getUser(uid).catch(() => null);
  return db().runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (!cur) return null;
    if (!needsNpsProfile(cur)) return cur;

    const email = String(cur.email ?? authUser?.email ?? "");
    const fullName = String(cur.name ?? authUser?.displayName ?? (email.split("@")[0] || "Student"));
    const reg = typeof cur.regNumber === "string" && /^\d{10}$/.test(cur.regNumber) ? cur.regNumber : null;

    const candidates = usernameCandidates(email, uid);
    const refs = [...candidates.map((c) => db().doc(`usernames/${c}`)), ...(reg ? [db().doc(`admissionNumbers/${reg}`)] : [])];
    const snaps = await tx.getAll(...refs);
    const owned = (i: number) => !snaps[i]!.exists || snaps[i]!.data()?.uid === uid;
    const pick = candidates.findIndex((_, i) => owned(i));
    if (pick < 0) throw new Error("Could not allocate a username for a DARS account");
    const username = candidates[pick]!;
    const admissionFree = !!reg && owned(candidates.length); // a number already indexed to someone else is left unlinked rather than stolen

    const now = Date.now();
    const patch: UserData = {
      role: "STUDENT", fullName, username, usernameNormalized: normalizeUsername(username), phone: null,
      admissionType: admissionTypeOf(reg), admissionNumber: admissionFree ? reg : null, admissionStatus: admissionFree ? "PROVIDED" : "AWAITING",
      // DARS now collects a birthday too: keep it (and the DOB index entry DARS wrote beside it) instead of resetting it.
      dateOfBirth: typeof cur.dateOfBirth === "string" ? cur.dateOfBirth : null, profileImageUrl: null, cloudinaryPublicId: null, bio: "", socialLinks: {}, activeSocialLinks: [],
      birthdayVisibility: false, emergencyContacts: [], allergies: "", stateOfOrigin: null, localGovernmentArea: null, bankDetails: null,
      emailVerified: authUser?.emailVerified ?? false, accountStatus: "ACTIVE", updatedAt: now,
      ...(cur.email ? {} : { email }), ...(cur.name ? {} : { name: fullName }),
    };
    tx.set(ref, patch, { merge: true });
    tx.set(db().doc(`usernames/${username}`), { uid });
    if (admissionFree && reg) tx.set(db().doc(`admissionNumbers/${reg}`), { uid, ...buildPublicProfileFields({ fullName, email, accountStatus: "ACTIVE" }, now) });
    tx.set(db().doc(`auditLogs/link_${uid}`), { actorUid: uid, actorRole: "STUDENT", action: "ACCOUNT_LINKED_FROM_DARS", resourceType: "user", resourceId: uid, reason: null, metadata: {}, createdAt: now });
    return { ...cur, ...patch };
  });
}

/**
 * The reverse of adoptDarsUser's registration-number step: a student who came to DARS from NPS with no admission number
 * adds their registration number there. This links it as their NPS admission number. Additive and idempotent; a number
 * that isn't a valid NPS admission number (DARS-only Education codes, or the wrong Regular/CEP type) or is already
 * indexed to someone else is left alone, so the account simply stays "awaiting".
 */
export async function linkDarsRegNumber(uid: string): Promise<UserData | null> {
  const ref = db().doc(`users/${uid}`);
  return db().runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (!cur) return null;
    if (!needsAdmissionLink(cur)) return cur;
    const reg = cur.regNumber as string;
    const type = admissionTypeOf(reg);
    if (!type || (cur.admissionType && cur.admissionType !== type)) return cur;
    const idxRef = db().doc(`admissionNumbers/${reg}`);
    const idx = await tx.get(idxRef);
    if (idx.exists && idx.data()?.uid !== uid) return cur;
    const now = Date.now();
    const patch: UserData = { admissionNumber: reg, admissionType: type, admissionStatus: "PROVIDED", updatedAt: now };
    tx.set(ref, patch, { merge: true });
    if (!idx.exists) tx.set(idxRef, { uid, ...buildPublicProfileFields({ ...cur, ...patch }, now) });
    return { ...cur, ...patch };
  });
}

/** The user document for a signed-in uid, completing a DARS-created account first. Null when no profile exists at all. */
export async function loadUserForSession(uid: string): Promise<UserData | null> {
  const data = (await db().doc(`users/${uid}`).get()).data();
  if (!data) return null;
  if (needsNpsProfile(data)) return adoptDarsUser(uid);
  return needsAdmissionLink(data) ? linkDarsRegNumber(uid) : data;
}
