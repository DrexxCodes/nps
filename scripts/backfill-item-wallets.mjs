// Seeds itemWallets/{itemId} and itemWallets/{itemId}/days/{day} from existing paid orders (and any withdrawals).
// Needed once, for payments taken BEFORE per-item wallets existed. Dry run by default: add --apply to write.
// Run when nobody is paying (live payments increment the same counters). Safe to re-run: it overwrites with exact totals.
//   npm run backfill:wallets            (dry run)
//   npm run backfill:wallets -- --apply
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

const TZ = "Africa/Lagos"; // keep in step with SETTLEMENT_TIMEZONE in src/constants/withdrawals.ts
const day = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);

const settings = (await db.doc("settings/platform").get()).data() ?? {};
const holdHours = Number.isFinite(settings.withdrawalHoldHours) ? settings.withdrawalHoldHours : 24;
const cutoff = Date.now() - holdHours * 3_600_000;

const wallets = new Map();
const wallet = (id) => {
  if (!wallets.has(id)) wallets.set(id, { itemId: id, grossKobo: 0, releasedKobo: 0, withdrawnKobo: 0, reservedKobo: 0, paidOrders: 0, deliveredOrders: 0, noCollectionOrders: 0, days: new Map() });
  return wallets.get(id);
};

const orders = await db.collection("orders").where("paymentStatus", "==", "SUCCESSFUL").get();
for (const d of orders.docs) {
  const o = d.data();
  const w = wallet(o.itemId);
  const sub = o.subtotal ?? 0;
  w.grossKobo += sub;
  w.paidOrders += 1;
  if (o.fulfillmentStatus === "DELIVERED") w.deliveredOrders += 1;
  if (o.fulfillmentStatus === "NOT_REQUIRED") w.noCollectionOrders += 1;
  const k = day(o.paidAt);
  const b = w.days.get(k) ?? { day: k, amountKobo: 0, count: 0, lastPaidAt: 0 };
  b.amountKobo += sub; b.count += 1; b.lastPaidAt = Math.max(b.lastPaidAt, o.paidAt);
  w.days.set(k, b);
}
for (const w of wallets.values()) for (const b of w.days.values()) {
  b.open = b.lastPaidAt > cutoff;
  b.releasedKobo = b.open ? 0 : b.amountKobo;
  w.releasedKobo += b.releasedKobo;
}

const withdrawals = await db.collection("withdrawals").get();
for (const d of withdrawals.docs) {
  const x = d.data();
  if (!x.itemId) continue;
  const w = wallet(x.itemId);
  if (x.status === "PAID") w.withdrawnKobo += x.amountKobo;
  if (x.status === "PENDING") w.reservedKobo += x.amountKobo;
}

console.log(`Hold: ${holdHours} h. ${orders.size} paid orders, ${withdrawals.size} withdrawal(s), ${wallets.size} item wallet(s).`);
for (const w of wallets.values()) console.log(`${w.itemId}: gross ${w.grossKobo / 100} released ${w.releasedKobo / 100} withdrawn ${w.withdrawnKobo / 100} reserved ${w.reservedKobo / 100} days ${w.days.size}`);
if (!apply) { console.log("\nDry run. Re-run with --apply to write."); process.exit(0); }

const writer = db.bulkWriter();
const now = Date.now();
for (const w of wallets.values()) {
  const { days, ...counters } = w;
  writer.set(db.doc(`itemWallets/${w.itemId}`), { ...counters, updatedAt: now });
  for (const b of days.values()) writer.set(db.doc(`itemWallets/${w.itemId}/days/${b.day}`), b);
}
await writer.close();
console.log("\nWritten.");
