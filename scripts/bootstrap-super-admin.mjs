// Usage: BOOTSTRAP_EMAIL=... BOOTSTRAP_PASSWORD=... BOOTSTRAP_USERNAME=... BOOTSTRAP_NAME="..." npm run bootstrap:super-admin
// Run once from a trusted machine with the Firebase Admin credentials in .env.local. Never exposed over HTTP.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Missing ${k}`); process.exit(1); } return v; };
const email = need("BOOTSTRAP_EMAIL").toLowerCase();
const password = need("BOOTSTRAP_PASSWORD");
const username = need("BOOTSTRAP_USERNAME");
const fullName = need("BOOTSTRAP_NAME");
if (password.length < 12) { console.error("Use a password of at least 12 characters."); process.exit(1); }

initializeApp({ credential: cert({ projectId: need("FIREBASE_PROJECT_ID"), clientEmail: need("FIREBASE_CLIENT_EMAIL"), privateKey: need("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n") }) });
const db = getFirestore();

const existing = await db.collection("users").where("role", "==", "SUPER_ADMIN").limit(1).get();
if (!existing.empty) { console.error("A Super Admin already exists. Promote others from /admin/users."); process.exit(1); }

const user = await getAuth().createUser({ email, password, displayName: fullName, emailVerified: true });
const norm = username.trim().toLowerCase();
const now = Date.now();
await db.runTransaction(async (tx) => {
  if ((await tx.get(db.doc(`usernames/${norm}`))).exists) throw new Error("Username already taken");
  tx.set(db.doc(`usernames/${norm}`), { uid: user.uid });
  tx.set(db.doc(`users/${user.uid}`), {
    // DARS fields (same shape DARS writes) so this account can also sign in to DARS, as a non-admin there.
    name: fullName, regNumber: null, admin: false, scope: null, assignedCourses: [], banned: false,
    uid: user.uid, role: "SUPER_ADMIN", fullName, username, usernameNormalized: norm, email, phone: null, admissionType: null, admissionNumber: null,
    admissionStatus: "NOT_APPLICABLE", dateOfBirth: null, profileImageUrl: null, cloudinaryPublicId: null, bio: "", socialLinks: {}, activeSocialLinks: [],
    birthdayVisibility: false, emergencyContacts: [], allergies: "", stateOfOrigin: null, localGovernmentArea: null, bankDetails: null,
    emailVerified: true, accountStatus: "ACTIVE", createdAt: now, updatedAt: now,
  });
  tx.set(db.doc("settings/platform"), { enrollmentOpen: true, courseDurationYears: 4, academicSessionStartMonth: 10, schoolTimezone: "Africa/Lagos", platformFeeEnabled: false, platformFeePercentage: 0, platformFeeFlatKobo: 0, currency: "NGN", feeConfigVersion: 1, updatedBy: user.uid, updatedAt: now }, { merge: true });
  tx.set(db.collection("auditLogs").doc(), { actorUid: user.uid, actorRole: "SUPER_ADMIN", action: "SUPER_ADMIN_BOOTSTRAPPED", resourceType: "user", resourceId: user.uid, reason: null, metadata: {}, createdAt: now });
});
console.log(`Super Admin created: ${email} (uid ${user.uid}). Remove BOOTSTRAP_* variables from your shell history.`);
