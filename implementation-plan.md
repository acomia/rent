# RENT APP — Implementation Plan

Phased plan to build v1 (per `project-scope.md`) on the stack in `tech-stack.md`. Tasks are sized roughly to half-day to two-day chunks for a solo dev. Phases are ordered so each one produces something testable end-to-end.

## Where we left off

Task marks: `[x]` done · `[~]` partially done, with what is missing stated inline · `[ ]` not started.

**Done:** Phases 0–3 complete. Phase 3.5 (design system + rebrand to **Renta**) complete.
Phase 4 is complete on the customer side and in the database; the admin side of it is not built.

**Next up, in order:**

1. **Admin fittings calendar** (Phase 4) — a fitting can now be confirmed or cancelled from the
   booking detail, but there is still no day view of the shop's fitting slots.
2. **Booking → unit status transitions** (Phase 4) — `item_units.status` is still set by hand in the
   admin editor and is not driven by booking state.
3. **Returns flow** (Phase 8 screen, but Phase 4 lifecycle) — a picked-up booking currently has
   nowhere to go: nothing moves it to `returned`/`completed` or opens the cleaning window.
4. **Phase 5 payments.** Note this is now a _hard_ dependency rather than a nice-to-have: RLS
   deliberately gives the client no path to mark its own deposit paid, so until the PayMongo webhook
   exists, bookings can only ever be created as `pending`. See the Phase 5 notes.

**Environment:** the dev Supabase project (`rent-dev`) is live and seeded — 4 categories, 10 items,
30 units, 2 customers, 1 admin. Migrations `0001`–`0013` are applied. A Supabase MCP server is
connected, so migrations can now be applied and verified directly rather than pasted into the SQL
editor by hand.

**No test runner is configured** (still true — no jest/vitest, no `test` script). Phase 4's
availability and buffer maths were verified instead with behavioural SQL run against the live
database inside self-rolling-back transactions. That is a real substitute for the DB-level logic but
NOT for the client-side pricing maths, which remains unverified.

## Decision Gates

Some open items in `project-scope.md` block specific phases. Resolve before starting that phase:

| Open Item                                                  | Blocks Phase | Status                                                                                                         |
| ---------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| #1 Inventory model (design+units vs. one-listing-one-item) | Phase 2      | **Resolved — design + units.** `items` + `item_units` (`0002_catalog.sql`). Bookings key on `unit_id`.         |
| #2 Pricing rules                                           | Phase 4      | **Resolved — flat per-day.** `items.rental_fee_per_day`; no weekend tier, no long-rental discount in v1.       |
| #3 Cleaning buffer                                         | Phase 4      | **Resolved — per item, not shop-wide.** `items.cleaning_buffer_days` (seeded 1–2). Snapshot onto each booking. |
| #4 Cancellation policy                                     | Phase 5      | **STILL OPEN.** Now also blocks the Cancel-booking action that already ships — see Phase 4 notes.              |
| #5 Penalty formula                                         | v2 only      | Not needed for v1 (admin-entered late fees).                                                                   |
| #6 KYC add-ons (ID upload / tiered deposit)                | Phase 1      | **Resolved — OTP only.** Nullable `id_document_url` / `deposit_tier` left for later.                           |
| #7 Delivery specifics                                      | v1.1         | Deferred; does not block v1. `fulfillment_type` has no `delivery` value, so no row can claim it.               |
| #8 Admin roles                                             | Phase 3      | **Resolved — single role.** `admins` table; nullable `role` defaults to `owner`.                               |

---

## Phase 0 — Foundations & Setup

Goal: tooling and accounts ready, "hello world" running on a real device.

- [x] Create GitHub repo, add `.gitignore`, `README.md`
- [x] Initialize Expo project (TypeScript template) — Expo SDK 57, RN 0.86
- [x] Add NativeWind (Tailwind for RN) and verify a styled screen renders
- [x] Configure ESLint + Prettier + commit hooks — husky + lint-staged
- [x] Create Supabase project (dev environment) — `rent-dev`, ap-southeast-1
- [ ] Create PayMongo account (test mode) — needed for Phase 5
- [ ] Create Resend account, verify a sending domain — needed for Phase 6
- [ ] Create SMS provider account (Semaphore or Twilio — PH-capable) for pickup + overdue alerts
- [x] Set up `.env` handling (`expo-constants` + `EXPO_PUBLIC_*` vars)
- [x] Configure EAS Build profiles (dev / preview / production) — `eas.json`
- [x] Run dev build on the iOS simulator. **Not yet verified on a physical device, or on Android at
      all** — and Android is the majority of this audience, so this is worth closing early.
- [x] Add basic folder structure: `src/app/`, `src/features/`, `src/lib/`, `src/components/`, `src/db/`

**Done when:** a blank app boots on iOS + Android and hits Supabase.

---

## Phase 1 — Auth & Customer Profile

Goal: a real user can sign up, log in, and edit their profile.

- [x] Confirm KYC add-ons (Open Item #6) — **decided: OTP only** (no ID upload / tiered deposit in v1). `customers` keeps nullable `id_document_url` + `deposit_tier` so B/C bolt on later with no migration.
- [x] Enable Supabase Auth (email + password, phone OTP) — code done; dashboard config documented in README (disable email confirm, connect SMS provider)
- [x] Build sign-up screen (email, password, name, phone)
- [x] Build OTP verification screen (full `updateUser`→`verifyOtp` flow + `__DEV__` skip)
- [x] Build login screen + "forgot password" flow (recovery-OTP based)
- [x] Build session persistence + auth context (`AuthProvider` + `onAuthStateChange`, AsyncStorage)
- [x] Build profile screen (name, contact, email, address) — `@expo/ui` native form
- [ ] ~~Add ID upload~~ — **deferred**, OTP-only KYC decision (Open Item #6)
- [x] Add Terms & Conditions + Privacy Policy acceptance on signup (checkbox + atomic timestamp + `terms_version`)
- [x] Create `customers` table with row-level security policy (`src/db/0001_customers.sql`)

**Done when:** a customer can register, verify, log in across app restarts, and edit their profile.

---

## Phase 2 — Catalog (Read-Only)

Goal: customer can browse, search, filter, and view item details.

- [x] Decide inventory model (Open Item #1) — **design + units**
- [x] Create `items` table + `item_units` — `src/db/0002_catalog.sql`
- [x] Create `categories` table + seed data — gowns / costumes / shoes / accessories (item-type
      categories; `occasion` is a separate tag array so the filter sheet can slice by both)
- [x] Seed sample items — 10 items, 30 units, with real photo URLs (`0003_seed_catalog.sql`)
- [x] Build catalog list screen (two-column photo grid) — `(app)/category/[slug].tsx`
- [x] Build item details screen — `(app)/product/[id].tsx` (carousel, price, deposit, sizes, swatches)
- [x] Build search bar — `(app)/search.tsx`
- [x] Build filter sheet (category, size, color, price range, occasion) — `catalog/filter-sheet.tsx`
- [x] Wire TanStack Query for caching + pull-to-refresh
- [x] Handle empty / loading / error states — `catalog/states.tsx`, shared across the three screens

**Known gap:** the read path falls back to mock data only when Supabase is _unconfigured_, not when a
request _fails_. A paused project or a dropped connection therefore surfaces the error state rather
than degrading to the offline catalog — which is the opposite of what the PH-connectivity design goal
wants. Changing it means broadening `features/catalog/api.ts` to fall back on error, which is a real
decision (it would also mask genuine failures), so it is called out rather than silently changed.

**Done when:** a customer can browse the seeded catalog, search, filter, and open any item's details.

---

## Phase 3 — Admin Catalog Management

Goal: admin can add and manage items without engineering help.

- [x] Decide admin roles (Open Item #8) — **decided: single role for v1** (`admins` table, presence = admin). Nullable `role` defaults to `owner` so an owner/staff split bolts on later with no migration.
- [x] Create `admins` table + RLS policies — `src/db/0006_admins.sql` (+ `is_admin()` helper + admin write policies on catalog tables)
- [x] Build admin login (separate entry or role check on shared login) — **role check on shared login**; `isAdmin` on the auth context, `AdminGate` in `src/app/(app)/admin/_layout.tsx`, entry from the Profile screen
- [x] Build admin home / dashboard shell (empty for now) — `src/app/(app)/admin/index.tsx` (link cards + counts)
- [x] Build "Manage Items" list screen — `src/app/(app)/admin/items/index.tsx` (includes inactive items)
- [x] Build add/edit item form (with Zod validation) — `src/app/(app)/admin/items/[id].tsx` (react-hook-form + `itemSchema`)
- [x] Build photo upload (multi-photo, reorder, delete) → Supabase Storage — `expo-image-picker` → `item-photos` bucket (`src/db/0008_storage_item_photos.sql`)
- [x] Build category management screen (add / edit / delete categories) — `src/app/(app)/admin/categories/` (delete FK-guarded)
- [x] Build inventory status toggle (available / unavailable / damaged / under cleaning) — per-unit status chips in the item form
- [x] Add audit log writes on every admin mutation — DB triggers (`src/db/0007_admin_audit_log.sql`), not client code

**Done when:** an admin can fully populate and maintain the catalog on the phone.

---

## Phase 3.5 — Design System & Rebrand (added; not in the original plan)

Goal: one visual identity, defined once and applied everywhere, before the booking screens multiply
it. Driven by the design board in `DESIGN.md`.

- [x] Rename the app **Hiramda → Renta** — `app.json` (name, slug, scheme, bundle ids), `package.json`,
      brandmark, terms/privacy copy
- [x] Replace the token layer in `tailwind.config.js` — warm ivory ground, antique-bronze primary,
      charcoal commit action, and six semantic status tokens (pending / confirmed / out now /
      in cleaning / overdue / completed), each a pale fill plus an AA-passing ink
- [x] Swap the type stack — **Playfair Display** for display, **Inter** for the interface, replacing
      Poppins. Weight-per-family, because RN does not synthesise weights for loaded fonts.
- [x] Restyle every existing screen and primitive; strip all `dark:` variants
- [x] Pin the app to light mode — `userInterfaceStyle: "light"` plus a fixed `DefaultTheme`, since an
      ivory-and-bronze product has no honest inversion
- [x] Fix the splash and adaptive-icon backgrounds, which were still the old brand purple
- [x] Add `muted-dark` and audit contrast — the previous secondary text failed AA on dark surfaces

**Deliberately not done:** a dark variant. The board is light-only and the tokens exist but go unused.

**Known gaps:** category tiles render a glyph rather than a photograph, because `categories` has no
photo column and the board shows photos — either add the column or accept the glyph. The rename is
only partly real: the **native project is still `Rent.xcodeproj` with bundle id
`com.arnancomia.rent`**, because `app.json` was updated without an `expo prebuild`. Harmless locally,
but it must be resolved before an EAS build or a store submission.

---

## Phase 4 — Availability, Booking & Fittings (No Payments)

Goal: customer can reserve an item for a date range or book a fitting; admin can see and approve it.

- [x] Decide pricing rules (#2) — **flat per-day**; and cleaning buffer (#3) — **per item**
- [x] Create `bookings` table — `src/db/0010_bookings.sql`. Status carries the lifecycle only; there
      is no amount column and no `paid` value, so payment state cannot leak into it.
- [x] **Prevent double-booking at the DB level** — `bookings_no_overlap`,
      `EXCLUDE USING gist (unit_id WITH =, blocked_range WITH &&) WHERE (status not in
  ('cancelled','rejected'))`. `blocked_range` is a generated `daterange` covering the rental days
      plus the cleaning buffer. Verified against the live DB: overlapping rental rejected, booking
      inside the buffer rejected, first day after the buffer accepted, another unit of the same design
      unaffected, and cancelling releases the dates.
- [~] **Slot hold during checkout** — schema and sweeper exist (`status = 'hold'`, `hold_expires_at`,
  `expire_stale_holds()`), and the customer-facing hold screen with its countdown is built. But
  **no hold row is ever created**: the app inserts `pending` directly, because a customer cannot
  transition their own hold to a paid booking under RLS (correctly — only the webhook may).
  Closes with Phase 5. The `pg_cron` schedule for the sweeper is also not set up yet.
- [x] Add RLS policies to `bookings` — customer sees/creates only their own and may only cancel;
      admin sees and does everything. Verified **as the customer**, not as service role: inserting
      `approved` is rejected, and updating an own booking to `approved` is rejected.
- [x] Anchor all date logic to **Asia/Manila** — rental dates are `date` (a pickup is a calendar day,
      not an instant) and `today_manila()` replaces `current_date`, which follows the server timezone
- [x] Implement availability query — `item_day_states(item, from, to)` returns the three-state
      customer calendar across every unit of a design; plus `is_unit_free()` and `pick_free_unit()`
      (`0011_pick_free_unit.sql`). `pick_free_unit` must be SECURITY DEFINER: RLS hides other
      customers' bookings, so a client-side freeness check would confidently pick a taken unit.
- [x] Build calendar UI on item details — `components/booking/month-calendar.tsx`, driven by
      `item_day_states`, with a permanent legend
- [x] Build booking form (pickup, return, fulfillment) — `reserve/dates` → `range` → `fulfillment`
- [~] Build fitting-appointment flow — customer side done (`reserve/fitting`, a visibly different
  object from the rental calendar, and `fitting_at` is excluded from `blocked_range` so it never
  holds the dates). **Admin confirm / reschedule / cancel is NOT built.**
- [x] Build booking summary screen — `reserve/summary`, with the fixed four-row money block
- [x] Build booking status screen — `bookings/[id]`
- [x] Build customer's "My Bookings" list — `(tabs)/bookings.tsx`, grouped by what needs attention
      next rather than reverse-chronologically
- [x] Build admin's "Booking Management" screen (list + approve / reject / cancel) —
      `(app)/admin/bookings/index.tsx` (a decision queue: "Needs action" is the default filter and
      undecided bookings sort to the top) and `[ref].tsx` (customer, item, band, money, fitting, and
      the actions legal from the current state). Rejecting requires a reason, entered in an inline
      panel rather than `Alert.prompt`, which is iOS-only. Also added `0013_admin_reads_customers.sql`
      — `customers` had only a select-own policy, so the admin could read a booking but not the name
      of the person who made it. Verified as the admin: approve, reject-with-reason, a rejected
      booking releasing its dates, and both transitions landing in the audit log.
- [~] Build admin's "Fitting Appointments" calendar (view / confirm / reschedule / cancel) —
  confirm and cancel now exist on the booking detail; the standalone day-view calendar does not.
  Rescheduling is not built.
- [ ] Booking transitions update item status correctly — **not done.** `item_units.status` is still
      only set by hand in the admin item editor; it is not driven by booking state.
- [~] Unit-test the availability + pricing math — no test runner exists, so the DB-level logic was
  verified with behavioural SQL instead (see "Where we left off"). The client-side pricing in
  `features/booking/pricing.ts` is still untested.

**Also built, beyond the original list:**

- [x] `0012_booking_function_hardening.sql` — the Supabase database linter caught that
      `expire_stale_holds()` was SECURITY DEFINER, deleted rows, and was callable by `anon` over
      RPC; that `revoke ... from public` does NOT remove anon's access (Supabase grants the roles
      explicitly, so they must be named); and that three `language sql` helpers had a mutable
      `search_path`. **Run `get_advisors` after every DDL change** — this class of mistake is
      invisible otherwise.
- [x] The customer data layer — `features/booking/{api,hooks,pricing,dates,availability}.ts`, with
      the in-progress draft as client state in context and everything server-side on TanStack Query
- [x] The rental band, status badge, month calendar, money block, booking card, selection card,
      payment-method row, flow stepper, disclosure row and pickup code components

**Still open before this phase can be called done:**

- Open Item #4 (cancellation policy) now bites here, not just in Phase 5: **Cancel booking already
  ships** and simply sets `status = 'cancelled'` with no refund window, no deposit-forfeit rule and no
  record of who cancelled or why.
- The two admin booking screens are **unverified on device**: the signed-in dev account is not an
  admin, and `AdminGate` correctly bounces it. The data layer behind them is verified as the admin
  via SQL; the UI needs an admin session to view.
- The pickup screen renders a **placeholder pattern, not a scannable code**. A real one needs
  `react-native-qrcode-svg` + `react-native-svg`.
- Screens 13–16 of the flow (hold, payment method, processing, success) have not been seen on a
  device — they were reached by deep link, and taps could not be scripted in the simulator.

**Done when:** a customer can request a booking or a fitting, an admin can approve it, the item shows
reserved on those dates, and concurrent requests for the same slot cannot both succeed. _Three of
those four hold today; "an admin can approve it" does not._

---

## Phase 5 — Payments (Online Deposit)

Goal: booking is only confirmed once the deposit is paid online.

> **This is now a hard dependency, not an enhancement.** RLS deliberately gives the client no path to
> mark its own deposit paid or to approve its own booking, so today a booking can only ever be created
> as `pending` with nothing paid. The screens for this phase already exist as UI stand-ins — payment
> method (with GCash / Maya / GrabPay / card rows), the three-stage processing screen, payment success
> and booking confirmed — and the booking is created in the **processing** screen's completion
> callback rather than on the success screen's render, precisely so the webhook can take that place
> without the screens changing.
>
> The `payments` table (migration `0013`) is where payment state belongs. Nothing in `bookings`
> should learn about money.

- [ ] Decide cancellation/refund policy (Open Item #4) — include refund mechanics + who absorbs gateway fees
- [ ] Set up PayMongo SDK in Expo app
- [ ] Set up Supabase edge function for PayMongo webhook
- [ ] **Webhook must verify PayMongo signature and be idempotent** (dedupe on event id — webhooks retry and can arrive out of order/twice; otherwise bookings double-advance and payments double-record)
- [ ] Create `payments` table (booking_id, type, amount, paymongo_id, `status`: paid / balance_due / refunded / forfeited) + RLS (customer sees own, admin sees all)
- [~] Build deposit payment screen (GCash, GrabPay, Maya, card) — screen built
  (`reserve/payment.tsx`); the marks are coloured plates, so real brand assets are still needed,
  and nothing is wired to PayMongo
- [~] Handle PayMongo redirect/callback in app — `reserve/processing.tsx` stands in for it, with
  the staged progress and the failure state already designed
- [ ] Webhook: mark deposit as paid → confirm the slot hold → transition booking to "awaiting approval" (release/refund on hold-conflict, per Phase 4 slot-hold rule)
- [ ] Build payment receipt screen + Resend email with receipt — the "View receipt" buttons exist
      on the success, confirmed and after-return screens but are inert
- [ ] Build admin "record balance paid" action (in-shop balance)
- [ ] Build admin **manual late-fee / penalty** entry (v1 records admin-entered amounts; automated formula is v2)
- [ ] Build admin refund action (calls PayMongo refund API) + deposit-forfeit handling per cancellation policy
- [ ] Integration-test the webhook (duplicate delivery, bad signature, hold-conflict paths)

**Done when:** a customer pays a deposit online, the booking advances exactly once even on duplicate webhooks, and an emailed receipt arrives.

---

## Phase 6 — Notifications

Goal: customer gets timely push + email (+ SMS for time-sensitive alerts) without admin chasing them.

- [ ] Set up Expo Push (request permission, register device token, save to Supabase)
- [ ] Set up Resend templates (booking approved, payment received, pickup reminder, return reminder, overdue)
- [ ] Wire the SMS provider (from Phase 0) for **pickup reminder + overdue alert** (per revised scope — push/email are unreliable in PH for time-sensitive alerts)
- [ ] Create `notifications` table (audit of what was sent, per channel) + RLS (customer sees own)
- [ ] Edge function: on booking status change → push + email
- [ ] Edge function: scheduled cron for pickup reminder (1 day before) → push + email + **SMS**
- [ ] Edge function: scheduled cron for return reminder (morning of return) → push + email
- [ ] Edge function: scheduled cron for overdue alerts (day after return date if not returned) → push + email + **SMS**
- [ ] All cron schedules anchored to **Asia/Manila** (a UTC "morning of return" fires at the wrong local time)
- [ ] Build in-app notification inbox (optional but worth it)

**Done when:** all major booking lifecycle events trigger push + email reliably, and pickup + overdue also send SMS.

---

## Phase 7 — Delivery (v1.1 — DEFERRED, not in v1)

Goal: add delivery as a third fulfillment option after v1 ships.

> Fittings are **not** here — they moved into Phase 4 as a core v1 fulfillment option. This phase is delivery only, and the revised scope defers it to v1.1. Do not build during the v1 critical path.

- [ ] Decide delivery specifics (Open Item #7) — service area, fee model, courier, who books the rider, whether returns are delivered
- [ ] Integrate Google Maps SDK + address autocomplete
- [ ] Extend booking form: add delivery alongside pickup + fitting
- [ ] Add address fields to `bookings` (only when delivery chosen)
- [ ] Add delivery fee calculation (flat / distance / pass-through to courier)
- [ ] Admin notifications + queue for delivery requests

**Done when:** customer can choose delivery and admin sees delivery requests in a queue. (Ships in v1.1, after the v1 launch.)

---

## Phase 8 — Operations & Admin Dashboard

Goal: the admin has a single screen showing what needs attention today.

- [ ] Build admin dashboard widgets:
  - Today's pickups
  - Today's returns
  - Pending approvals
  - Unpaid balances
  - Overdue rentals
- [ ] Build customer management screen (search + view rental history)
- [ ] Build return management flow (mark returned → balance settled → item to "under cleaning" or "available")
- [ ] Build payment tracking screen (list of all payments, filterable)
- [ ] Build audit log viewer (admin actions)
- [ ] Build rental history screen for customers (past + current)

**Done when:** admin can run a full shop day from the dashboard.

---

## Phase 9 — Legal, Receipts, Polish

Goal: app is presentable to real customers and compliant with PH Data Privacy Act.

- [ ] Draft Terms & Conditions (consult a template; ideally a lawyer review)
- [ ] Draft Privacy Policy (PH DPA-compliant)
- [ ] Add T&Cs + Privacy screens reachable from settings
- [ ] Add receipt generation (PDF) for each completed booking
- [ ] Email receipts via Resend on booking completion
- [ ] Add "delete my account" flow (DPA requirement)
- [ ] Add app icons, splash screens, store screenshots
- [ ] Performance pass: image lazy-loading, list virtualization, query optimization
- [ ] Accessibility pass: contrast, touch target sizes, screen reader labels

**Done when:** legal docs are in place, polish is acceptable, performance is smooth on mid-range Android.

---

## Phase 10 — Beta with Real Shop & Launch

Goal: validate the app with the real shop in mind, fix what breaks, ship to stores.

- [ ] Recruit the target shop owner for beta testing
- [ ] Run the shop on the app for 2–4 weeks (parallel with their current system)
- [ ] Collect feedback weekly; triage into "fix before launch" vs. "v2"
- [ ] Migrate any test data; create production Supabase project
- [ ] Switch PayMongo to live keys
- [ ] App Store submission (TestFlight first → public release) — allow a few days' buffer; first submissions often bounce
- [ ] Play Store submission (internal track first → public release) — same buffer
- [ ] Set up basic analytics (Supabase logs; add PostHog if needed)
- [ ] Monitor first 2 weeks closely; daily checks

**Done when:** real customers are booking through the live app and the shop is operating from it.

---

## Sequencing Notes

- **Phases 0–4 are the critical path.** Everything else builds on a working catalog + booking flow. Fittings are part of Phase 4 (core v1), not a later add-on.
- **Get the booking-concurrency work in Phase 4 right first.** The exclusion constraint + slot hold are the correctness backbone; payments and notifications assume they hold.
- **Phase 5 (Payments) can start in parallel with Phase 4** once the booking schema is settled — wiring PayMongo and getting webhook signature/idempotency right takes its own debugging time.
- **Phase 7 (Delivery) is deferred to v1.1** per the revised scope — it is out of the v1 critical path entirely. v1 ships with pickup + fittings.
- **Don't skip Phase 10.** A 2-week beta with one real shop catches more bugs than weeks of solo testing.

## Rough Timeline (solo dev, part-time)

| Phase                                  | Estimate                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| 0 — Setup                              | 1 week                                                          |
| 1 — Auth                               | 1–2 weeks                                                       |
| 2 — Catalog                            | 1–2 weeks                                                       |
| 3 — Admin catalog                      | 1–2 weeks                                                       |
| 4 — Booking + Fittings                 | 3–4 weeks (incl. concurrency: exclusion constraint + slot hold) |
| 5 — Payments                           | 1–2 weeks                                                       |
| 6 — Notifications (push + email + SMS) | 1 week                                                          |
| 8 — Operations                         | 1–2 weeks                                                       |
| 9 — Polish                             | 1 week                                                          |
| 10 — Beta + launch                     | 3–4 weeks                                                       |
| **v1 Total**                           | **~4–5 months part-time, ~2–3 months full-time**                |
| 7 — Delivery (v1.1)                    | 2 weeks — _after v1 launch, not counted above_                  |

Phase 7 (delivery) is excluded from the v1 total. Phase 4 absorbed fittings and the concurrency work, so it grew ~1 week while Phase 7 left the v1 critical path — v1 net timeline is roughly unchanged. These estimates assume the open items are resolved on time and don't drift mid-phase.
