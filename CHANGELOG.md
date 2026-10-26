# Changelog

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
