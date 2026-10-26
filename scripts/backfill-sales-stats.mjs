// Seeds stats/owner_{uid} and stats/platform from existing paid orders. Dry run by default: add --apply to write.
// Run once, ideally when nobody is paying (live payments increment the same counters). Safe to re-run: it overwrites with exact totals.
//   npm run backfill:sales            (dry run)
//   npm run backfill:sales -- --apply
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const empty = () => ({ paidOrders: 0, grossKobo: 0, deliveredOrders: 0 });
const platform = empty();
const owners = new Map();
let scanned = 0;

const snap = await db.collection("orders").where("paymentStatus", "==", "SUCCESSFUL").get();
for (const d of snap.docs) {
  const o = d.data();
  scanned++;
  const mine = owners.get(o.itemOwnerId) ?? empty();
  owners.set(o.itemOwnerId, mine);
  for (const s of [mine, platform]) {
    s.paidOrders += 1;
    s.grossKobo += o.subtotal ?? 0;
    if (o.fulfillmentStatus === "DELIVERED") s.deliveredOrders += 1;
  }
}

console.log(`Scanned ${scanned} paid orders across ${owners.size} owner(s).`);
console.log("platform:", platform);
for (const [id, s] of owners) console.log(`owner_${id}:`, s);
if (!apply) { console.log("\nDry run. Re-run with --apply to write."); process.exit(0); }

const now = Date.now();
const batch = db.batch();
batch.set(db.doc("stats/platform"), { ...platform, seeded: true, updatedAt: now });
for (const [id, s] of owners) batch.set(db.doc(`stats/owner_${id}`), { ...s, seeded: true, updatedAt: now });
await batch.commit();
console.log("\nWritten.");
