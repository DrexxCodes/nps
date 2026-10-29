# Changelog

## 0.8.0 - Settlement hold, withdrawal requests, per-item money and ownership transfer

### Added
- **Settlement hold (Super Admin).** Platform settings > Withdrawals: "Hold period (hours)", 0-720, default 24 (providers settle the next day). Payments are grouped by settlement day (Africa/Lagos); a day's money becomes withdrawable once that many hours have passed since the day's most recent payment. The hold is compared at read time, so a new value applies to money that has not been released yet; money already released stays released. Changes are audited (`WITHDRAWAL_HOLD_CHANGED`).
- **Payments record their settlement day.** `confirmPayment` (the one function both the webhook and verify call, so each payment is recorded exactly once) now also writes the item's wallet and settlement-day document in the same transaction as the order. The webhook URLs and subscribed events are unchanged (`charge.success` for Paystack, `transaction.successful` for Credo). The transaction and the ledger's PAYMENT entry also store `settlementDay`.
- **Per-item wallets.** `itemWallets/{itemId}` (running totals) and `itemWallets/{itemId}/days/{YYYY-MM-DD}` (collections per day). Balances are one document read; days are released lazily (`settleWallet`) the first time a balance is read after the hold passes, so there is no cron and no scan of orders or the ledger.
- **Withdrawal requests.** An item's owner enters bank, account number and amount; the bank resolves the account name on the server (never browser-supplied) and everything is stored with the request (`withdrawals/{id}`). The amount is reserved in the same transaction, so two requests can't spend the same money. Minimum ₦100, at most 3 open requests per item. The owner can cancel an open request.
- **Platform admin queue** (Money page, Super Admin): open requests oldest first with the full account to pay (copy button). "Mark as paid" (optional transfer reference and note) deducts the amount from the item's balance in the same transaction and writes an immutable ledger entry; "Reject" needs a reason shown to the admin. Both are audited.
- **Item > Money tab:** balances (available, awaiting release with the time the next day opens, requested, withdrawn, collected), the request form, and that item's withdrawal history (latest 15 only are fetched).
- **PDF export** (`GET /api/exports/withdrawals?itemId=`): every withdrawal request (full account details, status, who and when, reference or reason), every settlement day and the balances. Not limited to 15.
- **Ownership transfer** (item > Ownership tab). The owner can hand an item to another active Admin; a Super Admin can move any item without the owner's permission (recorded as mode `SUPER_ADMIN`). The balance, history and sales totals follow the item. Open withdrawal requests are cancelled and their money returned to the balance (they were made to the previous owner's account). Payments that land after a transfer go to the new owner. `items/{id}/ownershipTransfers` keeps the record; the audit log gets `ITEM_OWNERSHIP_TRANSFERRED`.
- `scripts/backfill-item-wallets.mjs` (`npm run backfill:wallets`): builds wallets for payments taken before this release (dry run by default).
- `tests/wallet.test.ts`.

### Changed
- `/admin/withdrawals` (Money) now shows balances per item you own (and the queue for the Super Admin). `/admin/withdrawals/history` redirects there; history is per item.
- Admin overview "Available balance" reads the item wallets instead of summing every ledger entry (`lib/server/ledger.ts`).
- `GET /api/withdrawals?itemId=` returns balances and the latest 15 requests; `POST /api/withdrawals` creates a request. The old read-only "transfers are not enabled" behaviour is gone.
- Bank list is cached per server instance for 6 hours (`lib/server/banks.ts`) instead of calling Paystack every time a bank form opens.
- `confirmPayment` reads the item once more inside its transaction so the money and the order's `itemOwnerId` always go to the item's current owner.
- Delivering an order also bumps the item's own delivered counter (`recordWalletDelivery`) so sales totals can move with an item.

### Deploy steps
1. `firebase deploy --only firestore:indexes` (new: `withdrawals(itemId, requestedAt)`, `withdrawals(status, requestedAt)`, `days(open, lastPaidAt)`). Pages that need an index show an error until it finishes building.
2. `npm run backfill:wallets` (dry run), then `npm run backfill:wallets -- --apply`, once, when nobody is paying. Without it, payments taken before this release are not in any wallet and can't be withdrawn.
3. Set the hold under Platform settings > Withdrawals.

### Notes
- Withdrawals are paid by hand by the platform admin; NPS does not call any provider transfer API.
- Account-name lookup uses Paystack's bank API (same as student bank details). Keep Paystack keys saved even when Credo takes payments.
- Refunds are not modelled yet (no code path writes them); if one is added it must decrement `grossKobo` on the wallet.

## 0.7.1 - Content-Security-Policy

### Added
- **Content-Security-Policy on every page**, built per request with a nonce (`lib/csp.ts`, applied in `proxy.ts`). Only our own scripts and scripts carrying the nonce can run, so injected `<script>` tags and inline handlers are refused. This is the main defence for the admin key fields against script injection (XSS). Also sets `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `upgrade-insecure-requests` (production only).
- Allowed outside origins, and why: `res.cloudinary.com` (images), `api.cloudinary.com` (profile photo upload), Firebase Auth (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `www.googleapis.com`, and your `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` helper frame that iOS/Safari/mobile browsers open). Payment checkouts are plain redirects, so Paystack and Credo need no entry.
- `CSP_REPORT_ONLY=1` switches to report-only (violations show in the browser console, nothing is blocked) for testing.
- `tests/csp.test.ts`.

### Changed
- `proxy.ts` now runs on all pages (not just the protected areas); the signed-out redirect is unchanged and still limited to `/dashboard`, `/admin`, `/staff`, `/items`. APIs, static assets and the service worker are skipped.
- `layout.tsx` puts the request nonce on the two inline `<head>` scripts (theme and PWA flag). The layout was already dynamic (it reads the session), so there is no extra rendering cost.
- Styles keep `'unsafe-inline'` because the UI uses React `style` attributes.

## 0.7.0 - Switchable payment providers (Paystack and Credo)

### Added
- **Credo** as a second payment provider (hosted checkout, card and bank transfer). Initialize uses the public key, verification uses the secret key, `bearer: 1` so students are charged exactly our total (same as Paystack). Sandbox and production are selectable (`api.credodemo.com` / `api.credocentral.com`).
- **Super Admin panel** (Platform settings > Payment provider) to save keys, see the webhook URL to paste into each dashboard, and switch which provider takes new payments at any time. Two-step confirm; a provider can only be activated once its keys are saved.
- **Stored per provider:** Paystack secret + public key; Credo public key, secret key, business code, environment and an optional webhook signing signature. Secrets are sealed with AES-256-GCM using `PROVIDER_SECRETS_KEY` before they reach Firestore (`settings/paymentProviders`), never sent back to the browser (masked to the last 4 characters), and every save/switch is written to the audit log without secret values.
- **Credo webhook** at `/api/payments/webhook/credo`: `X-Credo-Signature` is checked (constant-time) against SHA-512(secret key + business code) computed from the stored keys, or the stored dashboard signature; the payload's business code must match. Because that digest is fixed rather than body-bound, the payload is never trusted: the reference is looked up in our records and the payment is re-verified through Credo's API before it is marked paid. Handles `transaction.successful`; `transaction.transaction.transfer.reverse` is audited; failed/settlement events are acknowledged and ignored (the receipt/verify flow settles failures).
- `tests/payment-providers.test.ts` (signature, status mapping, amount units, metadata).

### Changed
- Payment code goes through a provider interface (`lib/server/providers/`: `paystack`, `credo`, `config`, `crypto`, `webhook`, `index`) instead of calling Paystack directly. `lib/server/paystack.ts` is removed; its bank helpers moved to `providers/paystack.ts`.
- Every `References` / `transactions` record now stores `provider`, `providerRef` and `providerTransactionId` (replaces `paystackTransactionId`). Verify, webhook and reservation reconciliation use the provider that took the payment, so switching never strands in-flight payments. Records without a `provider` are treated as Paystack. The processor-fee ledger entry also records its provider.
- The original `/api/payments/webhook` URL stays Paystack's, so the existing Paystack dashboard setting is untouched.
- Checkout fails before reserving a batch slot if the active provider has no keys.
- **Latency:** after a webhook confirms a payment the order email is sent after the response (`after()`), so the webhook answers inside Credo's 5-second window. Outbound provider calls now time out after 15 s instead of hanging. Provider settings are cached per instance for 15 s, so checkout and webhooks add no extra reads.
- Receipt page finds our reference even if a provider appends its own query parameters to the callback URL, and falls back to the provider's reference (`transRef`) to locate the record.
- Copy no longer names Paystack (checkout button, receipt checking message, orders empty state, fee note, withdrawals note).
- `PAYSTACK_SECRET_KEY` is now optional (fallback until keys are saved in the panel). New optional env var `PROVIDER_SECRETS_KEY` (32+ characters) is required to save keys in the panel.

### Notes
- Credo status codes 0, 4 and 5 count as paid; 3 and 7 failed; 1 and 2 refunded; 9, 10, 14 and 15 abandoned; the rest stay pending.
- Credo's docs show amounts in kobo on verify but naira in the webhook example, so the reported amount is read in whichever unit reproduces what we charged. Anything else fails the amount check. Confirm with one sandbox payment.
- Bank list and account-name lookup (student bank details) still use Paystack, since Credo's docs have no equivalent; keep Paystack keys saved while that feature is used.

## 0.6.0 - Item-first landing page, parallax hero, ID-style student profile

### Changed
- **Landing page** now presents NPS as a place to buy NAPSS items: new headline and copy, "Browse items" is the primary action, and the floating "NAPSS Student ID" card is gone. Added a "How it works" row (browse, pay, collect). The NFC bullet was replaced by "Pick sizes and options right on the item".
- **Hero background** is the supplied photo (`public/images/hero.webp`, converted from `hero2.jpg`, 136 KB) as a parallax layer under a dark scrim: `components/landing/ParallaxBg.tsx` moves it at 0.3x scroll speed with one passive listener + rAF, transform only, off-screen frames skipped, disabled for `prefers-reduced-motion`. Served through `next/image` with `priority`.
- **`/st/[admissionNumber]`** rebuilt on the Digital ID layout: left-aligned full-width header (avatar, eyebrow, name, admission number, class), a ruled membership row (association, birthday when shown), then a tab-style "Profile" heading with About and Links in two columns (stacked on mobile). Links now show the handle/URL, not just an icon. Only public fields are used (no email, department or fees).
- The profile page no longer uses the aurora backdrop or the centred glass card. `body:has([data-plain])` hides the aurora and makes the light theme white on any page that opts in with `data-plain`.
- Default meta description no longer mentions ID services.

### Changed (branding)
- All icons regenerated from the official NAPSS logo (`napss.png`, 1080px): `public/icons/{icon-192,icon-512,logo,maskable-512}.png`, `public/{favicon.ico,favicon-32.png,apple-touch-icon.png}`, and the matching Next file-convention icons `src/app/{icon.png,apple-icon.png,favicon.ico}`.
- Sizes: any-purpose 192/512 as transparent circular seal; maskable 512 opaque white with the seal inside the 80% safe zone; Apple touch 180 opaque white (iOS ignores transparency); `favicon.ico` holds 16/32/48/64.
- Service worker cache bumped to `nps-shell-v2` so installed PWAs pick up the new icons.

### Fixed (order emails)
- Duplicate payment emails: webhook, verify and receipt polling could all call `sendOrderEmail` at once and each send before any recorded `SENT`. The order is now claimed in a Firestore transaction (`emailStatus: SENDING`, `emailClaimedAt`) so exactly one caller sends; a claim older than 5 minutes is retaken, and a missing user releases the claim back to `PENDING`.
- Newlines in an item name can no longer reach the email subject.

### Changed (overlay)
- Hero overlay darkened (top 50%, middle 70%, bottom 90% black) for stronger text contrast over the photo.

### Changed (scroll-stack)
- **How it works** is now three full-screen sticky panels (forest, mint, green) that slide over each other as you scroll, with the grid backdrop from the reference, rounded top edges and a "Browse items" button on the last panel. Full-bleed like the hero. New: `components/landing/{HowItWorks,StepPanel,SmoothScroll}.tsx`.
- **Lenis smooth scrolling** (`lenis` ^1.3.11 added to `package.json`, run `pnpm install`) is applied on the landing page only, via `ReactLenis root`. It is off for reduced-motion users (native scroll). Lenis' recommended base CSS is inlined in `globals.css`.

### Changed (follow-up)
- Removed the three stat cards from the hero.
- Hero is now full-bleed: spans the full viewport width on every screen size, no rounded container, and slides up behind the floating navbar. Content stays aligned with the page column. `body:has([data-landing])` uses `overflow-x: clip` so the 100vw breakout never causes sideways scroll.
- Parallax image is a plain `<img>` with inline styles (no `next/image`), and the scrim is lighter so the photo reads through.

### Fixed
- Hero photo not showing: the parallax layer and the dark scrim no longer depend on Tailwind generating new classes (`bg-gradient-to-*` is `bg-linear-to-*` in Tailwind v4). Insets and gradient are inline styles, and the image is `unoptimized` (already a 136 KB WebP) so it does not need the image optimizer / `sharp`.
- Renamed "Services" to "Items" in the navbar, items page title, and the "Browse services" / "Back to services" links.

### Removed
- Unused `float-card` keyframes.

### Added
- `socialDisplay()` in `lib/social.ts`; `data/landing.ts`; `data/social-icons.ts`; `components/profile/public/{ProfileHeader,ProfileDetails}.tsx`; `components/landing/{Hero,ParallaxBg}.tsx`.

## 0.5.0 - Single sign-in with DARS, DARS birthdays and registration numbers respected

### Added
- **Single sign-in with DARS.** Signing in sets an HMAC-signed httpOnly cookie plus a readable hint cookie (`/api/auth/session` now does both; sign-out clears them). A signed-out visitor with a live DARS session sees "Welcome back, {name}: continue as {name}?"; one tap exchanges it for a Firebase custom token and creates the normal NPS session (honours `?next=`). Sessions that predate this are picked up quietly by `POST /api/auth/sso/session`. New: `lib/sso/*`, `lib/client/sso.ts`, `/api/auth/sso`, `/api/auth/sso/session`, `components/auth/SsoBridge.tsx`. Off unless `SSO_SECRET` is set.
- `linkDarsRegNumber`: a student who added their registration number in DARS (arriving from NPS without an admission number) gets it linked as their NPS admission number and indexed the next time the account loads. Skips DARS-only Education codes, a Regular/CEP mismatch, and numbers indexed to someone else.

### Changed
- Sign-in and enroll pages show a fixed inline block ("You're signed in to DARS as {name}" + **Continue with DARS** + "or sign in with your email") whenever DARS has a live session, even after signing out. Other pages keep the floating card.

### Fixed
- SSO sync no longer trusts the hint cookie alone (a stale one from before `SSO_COOKIE_DOMAIN` was set could stop the shared cookie ever being written). It now syncs once per tab session and reads every copy of the hint cookie.
- `adoptDarsUser` reset `dateOfBirth` to `null`; DARS now collects birthdays, so adoption keeps the stored date (and its DOB index entry).

### Setup
- Add `SSO_SECRET` (same 32+ char value in both apps) and, in production, `SSO_COOKIE_DOMAIN` (e.g. `.yourschool.edu.ng`). Both apps must sit on subdomains of one domain you control.
- `SSO_DISABLED` error code added (501).

## 0.4.0 - Receipts, live tracking, no-collection items, portals

### Added
- **Receipt page** (`/dashboard/receipt?reference=...`) is now Paystack's callback. It reads our own `References/{reference}` record: paid shows the receipt (items, options, fee breakdown, what happens next, print), otherwise `ReceiptWatcher` keeps checking every ~1.5s and, if still pending after 5 seconds, calls `/api/payments/verify`, which asks Paystack's transaction API directly and updates the record. Failed and abandoned payments get their own message. New endpoint `GET /api/payments/status` reads only our record. Old callbacks to `/dashboard/orders?reference=` redirect to the receipt.
- **Live order tracking.** `LiveOrders` re-checks `GET /api/orders` every 8s while the tab is visible and on focus, so new orders and admin batch changes (Queued > Processing > Ready for pickup > Delivered) show without a refresh. Each order shows a progress line. Batch status is read live from the batch documents, one read per distinct batch.
- **Non-physical items.** New "Collection" card on the item form: untick "physical" for dues and fees. Those items have no batches, pickup or NFC (enforced in `itemSchema`, the form and checkout), orders get `fulfillmentStatus: "NOT_REQUIRED"` and students just see a paid receipt. Admins export them from the Exports tab as usual. They are excluded from staff collection, `deliverOrder`, and the admin "Awaiting fulfillment" stat (`noCollectionOrders` counter). Items saved before this default to physical.
- **Student / Staff / Admin switch.** Staff, admins and the super admin can use the student dashboard (view items, pay, track, receipts, settings) and switch with the "Viewing as" pill on every dashboard. Sign-in now lands on each role's own home (`/go`).
- **Local DiceBear Lorelei avatars** for anyone without a photo (`@dicebear/core` + `@dicebear/lorelei`), generated by our own `/api/avatar/[seed]` and cached, replacing initials and the remote Micah URL. A real photo replaces it as soon as one is saved.
- `Drawer` (side drawer from the right) beside `Sheet`, which now always glides up from the bottom.

### Changed
- Enrollment type cards (Regular / CEP) have hover, keyboard-focus and pressed states, and show a selected state before the form opens.
- Profile-requirements prompt is a side drawer; item suspend/restore uses a bottom sheet with a reason field instead of `window.prompt`.
- Staff, admins and the super admin can now see and use `/dashboard/*` (it used to redirect them away).

### Fixed
- Orders not appearing until a manual refresh after paying: the old return page rendered the (empty) list before the payment was confirmed and then raced `router.replace` with `router.refresh`.

### Upgrade
- `pnpm install` (new dependencies). Commit the updated `pnpm-lock.yaml`.
- `components/student/VerifyOnReturn.tsx` is no longer used and can be deleted.

## 0.3.1 - Signed-in catalog, PWA entry, 404 page

### Changed
- **Services are for signed-in users only.** `/items` and `/items/[id]` redirect signed-out visitors to `/login?next=...` (optimistic redirect in `proxy.ts` plus a server check on each page), and `GET /api/items` and the quote endpoint now return 401 when signed out. Prices (including class prices) are no longer visible to anonymous visitors.
- **Installed PWA opens on sign-in.** When the app runs standalone, `/` skips the landing page: signed-out users go to `/login`, signed-in users to their role's home (`PwaEntry`). Browsers still see the landing page.
- **404 page** now shows `public/404.svg` with a friendlier message. It renders inside the root layout, so the header and footer stay.

## 0.3.0 - Variable sets and class pricing (Advanced configuration)

### Added
- **Advanced configuration** card on the new/edit item form (`/admin/items/new`, `/admin/items/[id]`), built from separate modules in `components/admin/advanced/`: `AdvancedConfig` (collapsible shell), `VariantSetsEditor` + `VariantOptionsEditor`, `ClassPricingEditor`.
- **Variable sets** (size, colour, ...): create any number (max 10) per item, each with its own values (max 50, add many at once with "S, M, L, XL"), reorder sets, and choose per set whether students **pick one or as many as apply** and whether the set is **required**.
- **Student checkout** shows each set (`VariantPicker`): radio pills for single choice, checkbox pills for multiple, Required/Optional badges, and the Pay button stays disabled until every required set is answered. The server re-validates every pick (`lib/variants.ts`), so the client is never trusted.
- **Class pricing**: the admin still sets the initial price, then can give any class (academic year 1..course duration) its own price, for a single item or per sub-item of a bundle. A student's class comes from their admission number; classes left blank, and students without an admission number yet, pay the initial price.
- **Students only see their own price.** Every student-facing surface (`/items`, `/items/[id]`, dashboard, `/api/items`, the quote endpoint) goes through `toStudentItem()`, which resolves the price for the viewer's class and strips all class overrides before anything reaches the browser or an order snapshot.
- **Exported PDF** now includes the variable sets: one column per set (up to 3, e.g. Size, Colour), or a single combined "Options" column when an item has more. Sets an admin later removes still appear for the orders that chose them.
- Chosen values are also shown in the admin orders table (when the item has sets), on the student's "My orders", and on the staff collection screen so the right variant is handed over.
- Orders and transactions snapshot `selectedVariants` (with names) and the `classYear` the price was resolved for.
- Tests: `tests/variants.test.ts`, `tests/class-pricing.test.ts` (selection rules, price resolution, no leakage of other classes' prices, schema validation, PDF column layout).

### Fixed
- Class-price inputs now always render one field per class (from the course length) and rebuild their form rows if missing, so the grid can no longer appear empty.

### Changed
- **PDF export is now one section (own pages) per item** instead of one merged table, because each item can have different variable sets. Single-item exports look as before, plus the new columns.
- Item price lock after the first paid order now also covers class prices, and compares a normalized fingerprint (`lib/pricing.ts`) so items saved before this release don't falsely read as "price changed".
- `ItemForm` was split: form types in `types/item-form.ts`; defaults, payload building and checks in `lib/item-form.ts`; the form now uses `FormProvider`.
- `quote()` takes the buyer's admission number and prices for their class; `Item` gains `classPrices` and `variantSets` (older items default to none, no migration needed).

## 0.2.0 - DARS account sharing and state/LGA data

### Added
- **Shared sign-in with DARS** (same Firebase project): NPS accounts now carry DARS's `users` fields and a `students/{regNumber}` record; DARS-created accounts are completed automatically on first NPS sign-in; any DARS admin is an NPS Admin (`resolveRole`); DARS `banned` blocks NPS sign-in; registration numbers are unique across both apps. Backfill script `scripts/backfill-dars-fields.mjs` for older NPS accounts.
- **State and LGA** from `@some19ice/nigeria-geo-core`: choose a state, then its LGAs load. Server validates the pair. Legacy "FCT" is read as "Federal Capital Territory".
- Tests: role resolution, DARS field shape, username generation, geo validation, DARS-account adoption against an in-memory Firestore.

### Changed
- Session cookie issuance refuses banned/suspended accounts with a clear message instead of redirect-looping.
- Profile save tolerates accounts without phone/DOB; the name change also updates DARS's copy.
- `/admin/users` shows effective roles and blocks role changes for DARS admins.
- Removed `src/data/nigeria-states.ts` (superseded by the package).
- Fixed a type error in `api/orders/route.ts` that failed `next build`.

## 0.1.0 - Initial build

First implementation of NPS (NAPSS Payment Suite) against PRD v1.0.

### Added
- **Foundation (Phase 1):** Next.js App Router + strict TypeScript + Tailwind v4; glassmorphism design system (green), light/dark/system themes without hydration flash; Firebase Auth with httpOnly session cookies; Firestore-backed roles (`users/{uid}.role` is the single authoritative source); enrollment with server-side username and admission-number reservations; admission number validation (134 Regular / 133 CEP); October-boundary academic year; Super Admin bootstrap script; Firestore rules; PWA (manifest, service worker, offline page) with icons generated from `icon.png`.
- **Payment items (Phase 2):** item CRUD, sub-items (required/optional), lifecycle statuses, suspend/restore with audit, requirement bottom sheet (photo, admission number, bank account via Paystack resolve), server-side quotes and integer-kobo fee maths with fee snapshots.
- **Payments (Phase 3):** `initialize` / `verify` / `webhook` routes, global `References/{ref}` collection, HMAC-SHA512 signature check on raw body, amount/currency/metadata verification, idempotent `confirmPayment`, immutable ledger entries, orders with snapshots, email preview in dev / AWS SES in `ENV=PROD`, retryable email.
- **Batches (Phase 4):** transactional capacity reservations with TTL, expiry reconciliation against Paystack before release, batch creation limits, status transitions (QUEUED > PROCESSING > READY_FOR_PICKUP), resize rules, per-order delivery, audit trail.
- **Profiles and NFC (Phase 5):** Cloudinary signed uploads (own-folder only), public profile at `/st/[admissionNumber]` with privacy-safe projection, social links (max 4, https/host validated), settings page, Web NFC capability detection and server-built payloads.
- **Staff and exports (Phase 6):** staff assignment, order lookup by reference/admission number, confirm-to-deliver flow, server-side PDF exports (repeating header, page numbers, wide Notes column, audited).
- **Birthdays (Phase 8):** birthday index, daily cron (`vercel.json`), timezone-correct date, idempotent claim, dev-mode log-only.
- Vitest unit tests for admission numbers, academic year, pricing, phone normalization and purchase windows.

### Not yet implemented (see README "Open items")
- Withdrawals / provider transfers (ledger-backed balances and history views are in place).
- Admin UI for placing a late-paid order into a batch (`batchPending` orders are flagged).
- Email-change flow, manual registration override for graduated students, LGA dataset, Playwright and emulator-based rules tests.

### Decisions
- Academic year uses the PRD 5.7 **formula**; the PRD's worked example contradicts it (see README).
