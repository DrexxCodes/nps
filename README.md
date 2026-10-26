# NPS - NAPSS Payment Suite

Student enrollment, payments, batch fulfillment and NFC ID services for NAPSS, UNIZIK. Developed by Drexx Technologies.

Stack: Next.js (App Router, TypeScript strict), Tailwind CSS v4, Firebase Auth + Firestore (Admin SDK on the server), Paystack, Cloudinary, AWS SES, Vercel.

## Quick start

```bash
npm install            # then optionally: npx npm-check-updates -u && npm install
cp .env.example .env.local   # fill in every value
npm run dev
npm test               # unit tests
```

`ENV=DEV` never sends email (previews are logged) and never runs transfers. Only `ENV=PROD` sends via SES.

### First Super Admin (never via the public form)

```bash
BOOTSTRAP_EMAIL=you@example.com BOOTSTRAP_PASSWORD='at-least-12-chars' \
BOOTSTRAP_USERNAME=admin BOOTSTRAP_NAME="Full Name" npm run bootstrap:super-admin
```
It refuses to run if a Super Admin already exists. It also seeds `settings/platform`. Super Admins can then promote Admins at `/admin/users`.

## Setup checklist

1. **Firebase:** create a project, enable Email/Password auth, create Firestore, add a service account, put its values in `FIREBASE_*`. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`). Clients can only read their own `users/{uid}`; every write goes through Route Handlers.
2. **Paystack:** set `PAYSTACK_SECRET_KEY`; webhook URL = `https://<domain>/api/payments/webhook` (event `charge.success`).
3. **Cloudinary:** set cloud name, API key and secret. Uploads are signed server-side and scoped to `nps/profiles/<uid>/`.
4. **AWS SES:** verify the sender, set `AWS_*` (needed only when `ENV=PROD`).
5. **Vercel:** set all env vars (including `CRON_SECRET`, 16+ chars; Vercel sends it as a bearer token to cron routes). `vercel.json` runs the birthday job at 23:00 UTC = 00:00 Africa/Lagos; the route computes the date in the configured school timezone regardless.

## Shared accounts with DARS

NPS and DARS use the **same Firebase project** (Auth + Firestore), so one email/password signs in to both. Both `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` must point at that project in each app.

- **One `users/{uid}` document.** NPS-created accounts also get DARS's fields (`name, regNumber, admin:false, scope:null, assignedCourses:[], banned:false`) and a `students/{regNumber}` record, so they can sign in to DARS and mark attendance. Setting an admission number later fills them in too. `fullName` changes keep `name` and `students/{reg}.name` in step.
- **DARS-created accounts** have no NPS profile. On first NPS sign-in one is added automatically (`lib/server/shared-user.ts`): stored role `STUDENT`, a generated username (from the email), admission number = DARS reg number. Phone and date of birth were never collected in DARS, so they stay empty until the student adds them in Settings.
- **Roles.** Any DARS admin (`admin: true`, either scope) is an **Admin** in NPS. Super Admin is never derived from DARS; it comes only from NPS's own `role`. Role is computed in `resolveRole()` and the stored NPS role is never overwritten from `admin`, so a demotion in DARS applies here immediately. A DARS admin's role can't be changed from `/admin/users` (the screen says to do it in DARS). Promoting someone to Admin/Staff in NPS does **not** make them a DARS admin.
- **Bans.** `banned: true` (DARS) or `accountStatus: "SUSPENDED"` (NPS) blocks sign-in to NPS.
- **Registration numbers** are unique across both apps: NPS refuses one that already has a DARS `students/{reg}` record.
- **Existing NPS accounts** created before this change need the DARS fields once: `npm run backfill:dars` (dry run), then `npm run backfill:dars -- --apply`.
- `firestore.rules` is deployed to the shared project. DARS only touches Firestore through the Admin SDK, so these deny-by-default rules don't affect it.

## Variable sets and class pricing

Configured under **Advanced configuration** on the item form.
- **Variable sets**: per item, admin-defined sets of values (Size: S/M/L, Colour: ...). Each set is single- or multiple-choice and required or optional. Picks are validated on the server and snapshotted onto the order (`selectedVariants`), then printed in the orders PDF.
- **Class pricing**: optional per-class prices (class = academic year from the admission number, `derivedAcademicYear`). The item's normal price is the initial price and the fallback. Students receive only their own price: use `toStudentItem()` (`lib/pricing.ts`) for anything a student can see, never raw `Item` data.

## Architecture

```
src/
  app/            pages + route handlers (api/*)
  components/     ui/ (glass primitives), layout/, auth/, items/, profile/, admin/, staff/, student/
  lib/            pure logic (admission, money, reference, item-status, social), validation/ (zod), pdf/, client/
  lib/server/     server-only: env, firebase-admin, session, payments, batches, ledger, email, paystack, cloudinary, audit
  constants/ types/ data/
```
- Authorization is enforced in every route handler and server page (`requireUser` / `requirePageUser`); `proxy.ts` only does an optimistic redirect.
- Money is integer kobo everywhere; prices and fees are recomputed on the server by the same `quote()` used for previews.
- Payment state machine: `PENDING > INITIALIZED > SUCCESSFUL | FAILED | ABANDONED`. `SUCCESSFUL` is terminal. A verified late payment may move FAILED/ABANDONED to SUCCESSFUL (money was received), with every transition timestamped.
- Batch capacity is protected by Firestore transactions over `reservedCount`/`paidCount`; expired reservations are released only after Paystack confirms the payment was not made.

## Assumptions and PRD ambiguities (please review)

1. **Academic year:** PRD 5.7's formula and its worked example disagree (formula: 2024 admit = Year 1 in Sep 2025, Year 2 in Oct 2025; example says Year 2 and Year 3). The **formula** is implemented and tested in `tests/core.test.ts`. If the example is what you want, change `academicYear()` in `src/lib/admission.ts` (add 1) and update the tests.
2. **Fee base:** the platform fee is `round(subtotal x %) + flat`, on the subtotal. Paystack's own charge is not added to the student's total; processor fees reported by Paystack are recorded as informational ledger entries.
3. **Roles** are read per request from `users/{uid}` (not custom claims): NPS's `role` combined with DARS's `admin` flag. See "Shared accounts with DARS".
4. **Price edits** are blocked for Admins after the first paid order (Super Admins may override).
5. **Batch resize** is also blocked while checkouts are in progress, so reserved slots can't be orphaned.
6. **Late payment with no capacity:** the paid order is kept with `batchPending: true` and an audit entry.
7. **Rate limiting** is in-memory per instance (best effort). Use Upstash/Redis for strict global limits.
8. **Visual style:** glassmorphism was requested for this build; it is applied with restrained blur and the PRD's green palette, off-white/charcoal (not pure white/black) backgrounds.
9. The supplied icon is navy; the PWA `theme_color` is green per the PRD. Change `public/manifest.webmanifest` if you prefer navy.

## Open items

- **Withdrawals / transfers:** intentionally not enabled. The PRD requires verifying Paystack's transfer/settlement model for your account first. Ledger balances and withdrawal history pages are ready.
- **Email change** needs Firebase's verify-before-update flow; the field is read-only for now.
- **Manual registration override** for graduated students (PRD 5.7) is not built; the rejection message is.
- **Tests:** unit tests exist for core logic. Emulator-based rules tests, concurrency tests and Playwright E2E are still to write.
- **Dependency versions** in `package.json` were set without network access. Run `npx npm-check-updates -u` before first install to pick up the latest releases, and verify `lucide-react`, `@react-pdf/renderer` and `@aws-sdk/client-sesv2` versions.
- This code was not compiled or run end to end in the build environment (no network). Expect a few type fixes on first `npm run typecheck`.

## API surface

Auth/enrollment: `POST /api/auth/session`, `POST /api/enrollment`, `POST /api/profile/admission-number`, `PATCH /api/profile`, `POST /api/profile/image-upload-signature`, `POST /api/profile/bank`.
Payments: `POST /api/payments/{initialize,verify,webhook,resolve-account}`, `GET /api/payments/banks`, `GET /api/items/[itemId]/quote`.
Items/orders: `GET /api/items`, `POST /api/admin/items`, `PATCH /api/admin/items/[id]`, `POST .../suspend`, `GET|POST .../staff`, `GET /api/orders[/id]`.
Batches: `GET /api/admin/items/[id]/batches`, `POST .../[batchId]/status`, `PATCH .../[batchId]/size`.
Staff: `GET /api/staff/orders/search`, `POST /api/staff/orders/[id]/deliver`, `GET /api/staff/nfc-payload`.
Other: `POST /api/exports/orders`, `GET /api/withdrawals` (read-only), `GET|PATCH /api/admin/settings`, `GET|POST /api/admin/users`, `GET /api/cron/birthdays`.

State/LGA: `PATCH /api/profile` validates `stateOfOrigin` + `localGovernmentArea` against `@some19ice/nigeria-geo-core` (37 states, 774 LGAs; the LGA must belong to the state). The Settings page loads the dataset lazily as its own chunk.
