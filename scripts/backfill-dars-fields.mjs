// One-off: gives NPS accounts created BEFORE the DARS integration the fields DARS needs to sign them in
// (name, regNumber, admin, scope, assignedCourses, banned) and creates their DARS students/{regNumber} record.
// Additive and idempotent: never overwrites an existing value. Dry run by default.
// Usage: node --env-file=.env.local scripts/backfill-dars-fields.mjs [--apply]
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Missing ${k}`); process.exit(1); } return v; };
const apply = process.argv.includes("--apply");
initializeApp({ credential: cert({ projectId: need("FIREBASE_PROJECT_ID"), clientEmail: need("FIREBASE_CLIENT_EMAIL"), privateKey: need("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n") }) });
const db = getFirestore();

let users = 0, patched = 0, students = 0, skipped = 0;
for (const doc of (await db.collection("users").get()).docs) {
  const u = doc.data();
  if (!u.role) continue; // DARS-created account: completed on first NPS sign-in, not here
  users++;
  const patch = {};
  const reg = typeof u.admissionNumber === "string" && /^\d{10}$/.test(u.admissionNumber) ? u.admissionNumber : null;
  if (u.name === undefined) patch.name = u.fullName ?? "";
  if (u.regNumber === undefined) patch.regNumber = reg;
  if (u.admin === undefined) patch.admin = false;
  if (u.scope === undefined) patch.scope = null;
  if (u.assignedCourses === undefined) patch.assignedCourses = [];
  if (u.banned === undefined) patch.banned = false;
  if (Object.keys(patch).length) { patched++; if (apply) await doc.ref.update(patch); }
  if (reg) {
    const sRef = db.doc(`students/${reg}`);
    const s = await sRef.get();
    if (!s.exists) { students++; if (apply) await sRef.create({ uid: doc.id, name: u.fullName ?? "", email: u.email, regNumber: reg, totalPresence: 0, createdAt: u.createdAt ?? Date.now() }); }
    else if (s.data()?.uid && s.data().uid !== doc.id) { skipped++; console.warn(`students/${reg} belongs to a different uid (${s.data().uid}); left alone for ${doc.id}`); }
  }
}
console.log(`${apply ? "APPLIED" : "DRY RUN"}: ${users} NPS users scanned, ${patched} need DARS fields, ${students} need a students record, ${skipped} conflicts.`);
if (!apply) console.log("Re-run with --apply to write.");
