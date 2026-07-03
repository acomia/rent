# RENT APP — Implementation Plan

Phased plan to build v1 (per `project-scope.md`) on the stack in `tech-stack.md`. Tasks are sized roughly to half-day to two-day chunks for a solo dev. Phases are ordered so each one produces something testable end-to-end.

## Decision Gates

Some open items in `project-scope.md` block specific phases. Resolve before starting that phase:

| Open Item                                                  | Blocks Phase                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| #1 Inventory model (design+units vs. one-listing-one-item) | Phase 2 (catalog schema) — **resolve first; foundational**                       |
| #2 Pricing rules                                           | Phase 4 (booking math)                                                           |
| #3 Cleaning buffer                                         | Phase 4 (availability logic)                                                     |
| #4 Cancellation policy                                     | Phase 5 (refund flow)                                                            |
| #5 Penalty formula                                         | v2 only — v1 uses admin-entered late fees (no formula needed)                    |
| #6 KYC add-ons (ID upload / tiered deposit)                | Phase 1 (signup) — phone OTP already decided, so this only gates optional extras |
| #7 Delivery specifics                                      | v1.1 (deferred) — does **not** block v1                                          |
| #8 Admin roles                                             | Phase 3 (admin auth)                                                             |

---

## Phase 0 — Foundations & Setup

Goal: tooling and accounts ready, "hello world" running on a real device.

- [ ] Create GitHub repo, add `.gitignore`, `README.md`
- [ ] Initialize Expo project (TypeScript template)
- [ ] Add NativeWind (Tailwind for RN) and verify a styled screen renders
- [ ] Configure ESLint + Prettier + commit hooks
- [ ] Create Supabase project (dev environment)
- [ ] Create PayMongo account (test mode)
- [ ] Create Resend account, verify a sending domain
- [ ] Create SMS provider account (Semaphore or Twilio — PH-capable) for pickup + overdue alerts
- [ ] Create Sentry project, add to Expo app
- [ ] Set up `.env` handling (`expo-constants` + `EXPO_PUBLIC_*` vars)
- [ ] Configure EAS Build profiles (dev / preview / production)
- [ ] Run dev build on physical iOS and Android devices
- [ ] Add basic folder structure: `app/`, `features/`, `lib/`, `components/`, `db/`

**Done when:** a blank app boots on iOS + Android, hits Supabase, and reports a test error to Sentry.

---

## Phase 1 — Auth & Customer Profile

Goal: a real user can sign up, log in, and edit their profile.

- [ ] Confirm KYC add-ons (Open Item #6) — phone OTP is already decided; decide only whether to also require ID upload / tiered deposit
- [ ] Enable Supabase Auth (email + password, phone OTP)
- [ ] Build sign-up screen (email, password, name, phone)
- [ ] Build OTP verification screen
- [ ] Build login screen + "forgot password" flow
- [ ] Build session persistence + auth context
- [ ] Build profile screen (name, contact, email, address)
- [ ] Add ID upload (if KYC requires it) — Supabase Storage bucket + photo picker
- [ ] Add Terms & Conditions + Privacy Policy acceptance on signup
- [ ] Create `customers` table with row-level security policy

**Done when:** a customer can register, verify, log in across app restarts, and edit their profile.

---

## Phase 2 — Catalog (Read-Only)

Goal: customer can browse, search, filter, and view item details.

- [ ] Decide inventory model (Open Item #1) → defines schema
- [ ] Create `items` table (+ `item_units` if "design + units" model)
- [ ] Create `categories` table + seed data (wedding, debut, formal, cosplay, school)
- [ ] Seed 10–20 sample items for development
- [ ] Build catalog list screen (grid view with photos)
- [ ] Build item details screen (photos carousel, price, deposit, size, rules)
- [ ] Build search bar (text query against item name/description)
- [ ] Build filter sheet (category, size, color, price range, occasion)
- [ ] Wire TanStack Query for caching + pull-to-refresh
- [ ] Handle empty / loading / error states

**Done when:** a customer can browse the seeded catalog, search, filter, and open any item's details.

---

## Phase 3 — Admin Catalog Management

Goal: admin can add and manage items without engineering help.

- [ ] Decide admin roles (Open Item #8) — single admin vs. owner/staff split
- [ ] Create `admins` table + RLS policies
- [ ] Build admin login (separate entry or role check on shared login)
- [ ] Build admin home / dashboard shell (empty for now)
- [ ] Build "Manage Items" list screen
- [ ] Build add/edit item form (with Zod validation)
- [ ] Build photo upload (multi-photo, reorder, delete) → Supabase Storage
- [ ] Build category management screen (add / edit / delete categories)
- [ ] Build inventory status toggle (available / unavailable / damaged / under cleaning)
- [ ] Add audit log writes on every admin mutation

**Done when:** an admin can fully populate and maintain the catalog on the phone.

---

## Phase 4 — Availability, Booking & Fittings (No Payments)

Goal: customer can reserve an item for a date range or book a fitting; admin can see and approve it.

- [ ] Decide pricing rules (Open Item #2) and cleaning buffer (Open Item #3)
- [ ] Create `bookings` table (`status` enum, pickup_date, return_date, fulfillment_type). **Booking status must NOT encode payment state** — no "paid" value; payment state lives in `payments` (Phase 5)
- [ ] **Prevent double-booking at the DB level:** add an `EXCLUDE USING gist` exclusion constraint on `(unit_id, daterange)` covering the rental range **plus** the cleaning buffer, so overlapping bookings are rejected atomically (read-then-write checks are not safe under concurrency)
- [ ] **Slot hold during checkout:** create a pending hold with a short expiry (e.g. 15 min) so a slot isn't taken twice while a customer heads to payment; expire abandoned holds (cron or on-read)
- [ ] Add RLS policies to `bookings` (customer sees only their own; admin sees all)
- [ ] Anchor all date logic to **Asia/Manila** (availability ranges, buffer, holds) — never UTC
- [ ] Implement availability query (Postgres function checking date ranges + cleaning buffer)
- [ ] Build calendar UI on item details (greys out unavailable dates)
- [ ] Build booking form (pickup date, return date, fulfillment choice — pickup or fitting; delivery is v1.1)
- [ ] Build fitting-appointment flow: a **separate** fitting-slot calendar that does **NOT** block the item's rental dates; admin confirms/reschedules/cancels slots
- [ ] Build booking summary screen (price breakdown: fee + deposit + total)
- [ ] Build booking status screen (pending / approved / etc.)
- [ ] Build customer's "My Bookings" list
- [ ] Build admin's "Booking Management" screen (list + approve / reject / cancel)
- [ ] Build admin's "Fitting Appointments" calendar (view / confirm / reschedule / cancel)
- [ ] Booking transitions update item status correctly
- [ ] Unit-test the availability + pricing math (edge cases: back-to-back rentals, buffer overlap, DST-free but TZ-correct boundaries)

**Done when:** a customer can request a booking or a fitting, an admin can approve it, the item shows reserved on those dates, and concurrent requests for the same slot cannot both succeed.

---

## Phase 5 — Payments (Online Deposit)

Goal: booking is only confirmed once the deposit is paid online.

- [ ] Decide cancellation/refund policy (Open Item #4) — include refund mechanics + who absorbs gateway fees
- [ ] Set up PayMongo SDK in Expo app
- [ ] Set up Supabase edge function for PayMongo webhook
- [ ] **Webhook must verify PayMongo signature and be idempotent** (dedupe on event id — webhooks retry and can arrive out of order/twice; otherwise bookings double-advance and payments double-record)
- [ ] Create `payments` table (booking_id, type, amount, paymongo_id, `status`: paid / balance_due / refunded / forfeited) + RLS (customer sees own, admin sees all)
- [ ] Build deposit payment screen (GCash, GrabPay, Maya, card)
- [ ] Handle PayMongo redirect/callback in app
- [ ] Webhook: mark deposit as paid → confirm the slot hold → transition booking to "awaiting approval" (release/refund on hold-conflict, per Phase 4 slot-hold rule)
- [ ] Build payment receipt screen + Resend email with receipt
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
- [ ] Set up basic analytics (Supabase logs + Sentry; add PostHog if needed)
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
