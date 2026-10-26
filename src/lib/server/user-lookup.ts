import "server-only";
import { adminAuth } from "./firebase-admin";
import { loadUserForSession, type UserData } from "./shared-user";

/**
 * Finds a user by email through Firebase Auth (case-insensitive, no Firestore index needed), then loads `users/{uid}`.
 * A DARS-created account that has never opened NPS is completed first (idempotent), so it can be given a role or assigned to an item straight away.
 */
export async function findUserByEmail(email: string): Promise<{ uid: string; data: UserData } | null> {
  const uid = await uidByEmail(email);
  if (!uid) return null;
  const data = await loadUserForSession(uid);
  return data ? { uid, data } : null;
}

/** Read-only: just the uid for an email (no profile completion). Null when no such account. */
export async function uidByEmail(email: string): Promise<string | null> {
  const authUser = await adminAuth().getUserByEmail(email.trim().toLowerCase()).catch((e: { code?: string }) => {
    if (e?.code === "auth/user-not-found") return null;
    throw e;
  });
  return authUser?.uid ?? null;
}
