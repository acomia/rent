# RENT APP — Implementation Plan

Phased plan to build v1 (per `project-scope.md`) on the stack in `tech-stack.md`. Tasks are sized roughly to half-day to two-day chunks for a solo dev. Phases are ordered so each one produces something testable end-to-end.

> **Read the Observed Workflow section of `project-scope.md` first.** It records how a rental
> actually runs today — Messenger enquiry, a size question, a deposit sent before any dates are
> chosen, and a customer-booked Lalamove collecting the item, sometimes a day early. Three of those
> steps contradict something this plan assumes, and the contradictions are flagged inline: the
> deposit rule (Phase 5), courier pickup (Phase 7a), and sizing as the primary conversion blocker
> (Phase 2).

## Where we left off

Task marks: `[x]` done · `[~]` partially done, with what is missing stated inline · `[ ]` not started.

**Done:** Phases 0–3 complete. Phase 3.5 (design system + rebrand to **Renta**) complete.
**Phase 4 is now complete on both sides** — the customer booking flow, the database, and the admin
shell (dashboard, booking queue, returns, fittings day view). Phase 3.6 (Home rebuild + Browse tab)
was added after it and is complete in the app, pending its migration being applied.

**Next up, in order:**

1. **Build the admin screen that edits `shop_settings` / `home_slides` / `announcements`.**
   `0016` is applied and seeded — Home renders the real hero, the shop's Makati address and pickup
   hours, and the announcement banner — but there is no UI for any of it, so the shop cannot change
   a word without the SQL editor. Smallest remaining piece of Phase 3.6, and the one that makes the
   phase's promise ("without a release") true.
2. **Phase 5 payments.** This is a _hard_ dependency rather than a nice-to-have: RLS deliberately
   gives the client no path to mark its own deposit paid, so until the PayMongo webhook exists,
   bookings can only ever be created as `pending`. See the Phase 5 notes.
3. **Booking → unit status transitions** (Phase 4) — still only partly driven by booking state:
   flagging condition on a return sets `item_units.status = 'damaged'`, but nothing moves a unit
   through rented/cleaning, and the admin item editor is still the only other writer.
4. **Device verification of the admin screens and the payment stand-ins** — see the Phase 4 gaps.
   The signed-in dev account is not an admin, so `AdminGate` bounces it; the data layer behind those
   screens is verified as the admin via SQL, but the UI has not been seen.
5. **Decide whether Phase 7a (customer-arranged courier pickup) enters v1.** Field observation says
   this is already how items leave the shop — the customer books a Lalamove, sometimes the night
   before — and the app has no value for it. It is small, and it touches the one thing the app is
   supposed to get right: who is holding the item, and from when. See Phase 7a and the Observed
   Workflow section of `project-scope.md`.

**Environment:** the dev Supabase project (`rent-dev`, Postgres 17, ap-southeast-1) is live and
seeded. **All migrations `0001`–`0017` are applied** — confirmed against `list_migrations`, which
tracks `0010`–`0017`; `0001`–`0009` predate migration tracking but every table and function they
create is present. `public` holds 11 tables: `admin_audit_log`, `admin_invite_codes`, `admins`,
`announcements`, `bookings`, `categories`, `customers`, `home_slides`, `item_units`, `items`,
`shop_settings`. **`payments` and `notifications` do not exist** — Phases 5 and 6 have no schema at
all yet.

Live data is thin: 2 bookings, statuses `pending` and `approved` only. Nothing has ever reached
`picked_up`, `returned` or `completed`, so the returns and pickup paths have never run against real
rows. 0 `hold` rows, as expected. `pg_cron` is **not installed**, so `expire_stale_holds()` exists
but is never scheduled.

A Supabase MCP server is connected, so migrations can be applied and verified directly rather than
pasted into the SQL editor by hand — and `get_advisors` run after each one.

**No test runner is configured** (still true — no jest/vitest, no `test` script). Phase 4's
availability and buffer maths were verified instead with behavioural SQL run against the live
database inside self-rolling-back transactions. That is a real substitute for the DB-level logic but
NOT for the client-side pricing maths, which remains unverified.

## Decision Gates

Some open items in `project-scope.md` block specific phases. Resolve before starting that phase:

| Open Item                                                  | Blocks Phase                    | Status                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 Inventory model (design+units vs. one-listing-one-item) | Phase 2                         | **Resolved — design + units.** `items` + `item_units` (`0002_catalog.sql`). Bookings key on `unit_id`.                                                                                                                                                                                                          |
| #2 Pricing rules                                           | Phase 4                         | **Rental fee resolved — flat per-day** (`items.rental_fee_per_day`). **Deposit rule STILL OPEN:** `items.deposit` is a flat per-item number the schema needed, not an observed shop rule. Confirm before launch.                                                                                                |
| #3 Cleaning buffer                                         | Phase 4                         | **Resolved — per item, not shop-wide.** `items.cleaning_buffer_days` (seeded 1–2). Snapshot onto each booking.                                                                                                                                                                                                  |
| #4 Cancellation policy                                     | Phase 5                         | **STILL OPEN — the only one left.** Blocks the Cancel-booking action that already ships — see Phase 4 notes.                                                                                                                                                                                                    |
| #5 Penalty formula                                         | v2 only                         | Not needed for v1 (admin-entered late fees).                                                                                                                                                                                                                                                                    |
| #6 KYC add-ons (ID upload / tiered deposit)                | Phase 1                         | **Resolved — OTP only.** Nullable `id_document_url` / `deposit_tier` left for later.                                                                                                                                                                                                                            |
| #7 Delivery specifics                                      | 7a: **needs a call** · 7b: v1.1 | **7a customer-arranged courier: observed and already happening** — the customer books their own Lalamove; needs a `fulfillment_type` value and a handover story, not an integration. See Phase 7a. **7b shop-operated delivery:** deferred; `fulfillment_type` has no `delivery` value, so no row can claim it. |
| #8 Admin roles                                             | Phase 3                         | **Resolved — single role.** `admins` table; nullable `role` defaults to `owner`.                                                                                                                                                                                                                                |

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
- [x] Build session persistence + auth context (`AuthProvider` + `onAuthStateChange`, **MMKV** — synchronous, so Supabase's storage interface takes it with no async shim)
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

**Sizing is the point of this phase.** In the observed workflow the first question a customer asks
is "what size is it" — before price, before dates — and the owner answers it by hand for every
enquiry. Replacing that exchange is the product's whole premise (see Known Risks in
`project-scope.md`), so item sizes, the size guide and honest photos are the conversion features,
not decoration. Anything that improves the answer to that question is worth more than another
filter — and anything that gives a _wrong_ answer is a threat to the premise, which is why
`0017_item_day_states_size.sql` (size-aware availability) is treated as a correctness fix rather
than an enhancement.

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
- [x] Build admin home / dashboard shell (empty for now) — now the real dashboard at `src/app/(app)/admin/(tabs)/index.tsx` (five stat cards; see Phase 8)
- [x] Build "Manage Items" list screen — `src/app/(app)/admin/(tabs)/items.tsx` (includes inactive items)
- [x] Build add/edit item form (with Zod validation) — `src/app/(app)/admin/item/[id].tsx` (react-hook-form + `itemSchema`)
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
- [x] Implement availability query — `item_day_states(item, from, to, size)` returns the three-state
      customer calendar across every unit of a design; plus `is_unit_free()` and `pick_free_unit()`
      (`0011_pick_free_unit.sql`). `pick_free_unit` must be SECURITY DEFINER: RLS hides other
      customers' bookings, so a client-side freeness check would confidently pick a taken unit.
- [x] **`0017_item_day_states_size.sql` — two calendar fixes.** (a) The calendar was not size-aware
      while `pick_free_unit` filters by size, so a customer who picked M could be offered a date held
      only by an L and be refused at the final insert. (b) The function was SECURITY INVOKER, so RLS
      hid _other customers'_ bookings from it — taken days rendered as available, and to `anon` every
      day looked free. It is now size-scoped and SECURITY DEFINER (it returns a day and one of three
      words, never customer data). The size flows `draft.size` → `useDayStates` (in the query key) →
      `fetchDayStates` → `p_size`. **Applied to `rent-dev` and verified against live data:**
      Aurora Ball Gown has 4 sellable units but only one L; with the L booked Sep 27–30 (+2 buffer),
      the unscoped calendar reports every day `available` while `p_size => 'L'` reports
      `unavailable` for the rental days and `cleaning` for the buffer, and `'M'` stays free. The
      definer half was verified as the `anon` role: `item_day_states` reports 4 unavailable + 2
      cleaning days while `select count(*) from bookings` returns 0 for that same caller.
      `get_advisors` flags the function under `anon_security_definer_function_executable` — expected
      and documented in the migration.
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
      `(app)/admin/(tabs)/bookings.tsx` (a decision queue: "Needs action" is the default filter and
      undecided bookings sort to the top) and `booking/[ref].tsx` (customer, item, band, money, fitting, and
      the actions legal from the current state). Rejecting requires a reason, entered in an inline
      panel rather than `Alert.prompt`, which is iOS-only. Also added `0013_admin_reads_customers.sql`
      — `customers` had only a select-own policy, so the admin could read a booking but not the name
      of the person who made it. Verified as the admin: approve, reject-with-reason, a rejected
      booking releasing its dates, and both transitions landing in the audit log.
- [~] Build admin's "Fitting Appointments" calendar (view / confirm / reschedule / cancel) —
  confirm and cancel on the booking detail, plus the **day view at `(app)/admin/fittings.tsx`**
  (a horizontal week strip over time-stamped appointment rows, backed by one memoised day→rows map).
  **Rescheduling is still not built.**
- [~] Booking transitions update item status correctly — **partly done.** Flagging condition during a
  return sets `item_units.status = 'damaged'`, which removes that copy from the calendar. Nothing
  else is driven by booking state: no unit moves through rented or cleaning, and the admin item
  editor is otherwise the only writer. (Availability does not depend on this — the `blocked_range`
  exclusion constraint does that work — so this is about the admin's inventory view, not correctness.)
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
reserved on those dates, and concurrent requests for the same slot cannot both succeed. _All four
hold today in code — approval, rejection and returns are built and verified as the admin via SQL.
What remains is seeing the admin screens on a device with a real admin session._

---

## Phase 3.6 — Home, Browse & Editorial Content (added; not in the original plan)

Goal: give the app a front door that is not a second catalog, and move the content a shop owner
changes weekly out of the bundle and into the database.

Home had been a search bar, a gender toggle and a category grid — a duplicate of what search and the
category screens already do, on the one screen that should answer "what do I need to do next".

- [x] **Split discovery out into a `Browse` tab** — search, the category grid and a Featured strip
      move to `(app)/(tabs)/browse.tsx`; the customer tab bar becomes Home / Browse / Bookings /
      Profile. `DESIGN.md` screen 6 is now two screens.
- [x] **Rebuild Home as a dashboard** — greeting, hero carousel, four shortcuts (Find a look, For an
      event, My bookings, Visit store), the next booking that needs attention, a scheduled
      announcement banner, and curated entry points that are real queries rather than static tiles.
- [x] **Remove the cart** — deleted `cart-context.tsx`, `cart-button.tsx`, `bag.tsx` and the
      `added`/`onAdd` props threaded through `ProductCard` into three listing screens. A rental is
      one item over one date range against one unit, so the booking flow takes an item straight to
      availability; a multi-item bag was a checkout metaphor this domain never had. (The DB had
      already dropped bags in `0005_remove_bags.sql`.)
- [x] **`0016_home_content.sql`** — `shop_settings` as a one-row singleton (the app had no record of
      the shop itself, so "Pick up at Makati" and "Visit store" had nowhere to read from),
      `home_slides`, and `announcements` with `is_active` plus a date window enforced in RLS so a
      banner is scheduled rather than remembered. All three public-read (a customer browses before
      signing in), admin-write via `is_admin()`, and seeded so the hero is never an empty rectangle.
- [x] `features/home/{api,hooks}.ts` — read-only, so it falls back to defaults when Supabase is
      absent, on the `features/catalog` pattern. 1-hour `staleTime`: this content changes a few times
      a year.
- [x] New screens: `categories.tsx` (the full list, now that Home carries no grid), `size-guide.tsx`
      (measurements and how alterations work), and a `similar-items` strip on the product page. The
      product page also states the four shop promises inline — they are identical for every piece, so
      they are not item columns until one of them stops being true.
- [x] Dropped Home's collapsing top bar — a Reanimated scroll handler and a shared-value pair spent
      hiding a 44pt header that now holds the notification affordance.

**Known gaps:**

- **No admin UI for any of it** — `shop_settings`, `home_slides` and `announcements` are SQL-editor
  only. This is the next task in the plan. (`0016` itself is applied and seeded; Home renders the
  real slides, address, pickup hours and announcement, confirmed on the simulator.)
- Announcement dismissal is component state, so a dismissed banner returns on remount. Wants a
  per-customer dismissal row, or MMKV at minimum.
- The "For an event" shortcut hardcodes `occasion: 'wedding'`, and the curated strip hardcodes its
  three queries. Fine while the shop has one obvious season; wants to be editorial content too.
- Home, Browse, the product page, the size guide and the availability calendar have now been seen
  running on the iOS simulator. The reserve flow past the calendar has not — synthetic taps could
  not be driven reliably, so every screen from fulfilment onward is still unseen on device.

**Done when:** Home tells a customer what they need to do next, Browse owns discovery, and the shop
can change the hero, its own address and an announcement without a release. _The first two hold; the
third needs the migration applied and the admin screen built._

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
> The `payments` table is where payment state belongs, and **it does not exist yet** (confirmed
> against the live schema) — it is the first item of schema work in this phase. The next free
> migration number is **`0018`**. Nothing in `bookings` should learn about money.

- [ ] Decide cancellation/refund policy (Open Item #4) — include refund mechanics + who absorbs gateway fees
- [ ] **Confirm how the deposit amount is actually computed** (Open Item #2). The app ships a flat
      per-item `items.deposit` because the schema needed a number; in the real flow the customer
      sends a deposit and the rule behind the amount was never observed. If it scales with item
      value, or is negotiated per customer, `items.deposit` is the wrong shape — and every money
      block in the booking flow reads from it, so this is not a local change. Ask before wiring
      PayMongo to an amount.
- [ ] Note the **flow-order mismatch**: today the customer pays a deposit and _then_ picks dates. The
      app requires dates first, which is the safer order (you cannot hold a range you have not
      chosen) — but it means a customer arriving with the old habit will be asked for something they
      did not expect. Worth watching in the beta rather than redesigning around.
- [ ] Set up PayMongo SDK in Expo app
- [ ] Set up Supabase edge function for PayMongo webhook
- [ ] **Webhook must verify PayMongo signature and be idempotent** (dedupe on event id — webhooks retry and can arrive out of order/twice; otherwise bookings double-advance and payments double-record)
- [ ] Create `payments` table (booking_id, type, amount, paymongo_id, `status`: paid / balance_due / refunded / forfeited) + RLS (customer sees own, admin sees all) — next migration number is `0018`
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

## Phase 7a — Customer-Arranged Courier Pickup (unscheduled — needs a v1/v1.1 call)

Goal: model the way items already leave the shop, without integrating a courier.

> **Why this exists.** Field observation (see the Observed Workflow section of
> `project-scope.md`): the customer books their own Lalamove and a rider collects from the shop —
> sometimes the night before the date they need the item. So "delivery" in the real business is not
> a courier integration the shop operates. It is a **handover to a third party**, arranged by the
> customer, and the app currently has no concept of it: `fulfillment_type` offers only pickup, the
> pickup screen addresses the customer, and every date calculation assumes the item leaves on
> `pickup_date`.
>
> This is cheap — no SDK, no fee model, no service area — and it touches the one thing the app is
> supposed to get right: who is holding the item, and from when. That is the argument for pulling it
> into v1 rather than parking it with Phase 7b. **Not yet decided.**

- [ ] Decide: does this ship in v1? (Blocks the rest of this phase, nothing else.)
- [ ] Add a `courier_pickup` value to `fulfillment_type` — a new migration, and the reserve
      fulfilment screen gains a third selection card. The card must say plainly that the customer
      books and pays the rider themselves; the shop only hands the item over.
- [ ] Decide how a **rider is authorised at the counter.** The pickup code already exists and is
      shown to staff, so the mechanism is there — what is missing is that it is currently framed as
      "show this to our staff" to the customer, who may not be present. Options: the customer
      forwards the code to the rider, or the shop verifies against the booking reference and the
      customer's name. Needs the shop's answer, not ours.
- [ ] Handle **collection before `pickup_date`.** A rider booked the night before takes the item out
      of the shop a day early. Two honest options, and they are not equivalent:
  1. **Model it** — a `released_at` (or `collected_at`) timestamp distinct from `pickup_date`, so
     "out now" and overdue read from when the item actually left. Correct, and it means
     `blocked_range` must cover the early day or a second booking can be sold a day on which the
     item is already gone.
  2. **Push it onto the customer** — require the rental range to start on the day the rider
     collects. Simpler, and it charges the customer for a day they did not want.

  Option 1 is the right one if this ships; option 2 is a trap that gets discovered at the counter.

- [ ] Admin side: the booking queue and the dashboard's "today's pickups" must distinguish a rider
      pickup from a customer pickup, because the shop prepares for them differently.
- [ ] Return leg: **not observed.** The scenario says nothing about how the item comes back, so do
      not assume a rider returns it. Ask the shop before building anything here.

**Done when:** a customer can say "a rider will collect this", the shop knows to expect one, and the
item's dates reflect when it actually left the shop rather than when the booking said it would.

---

## Phase 7b — Shop-Operated Delivery (v1.1 — DEFERRED, not in v1)

Goal: add shop-operated delivery as a fulfillment option after v1 ships.

> Fittings are **not** here — they moved into Phase 4 as a core v1 fulfillment option. This phase is shop-operated delivery only, and the revised scope defers it to v1.1. Do not build during the v1 critical path. Note that nothing observed in the real workflow requires this phase at all — the customer already solves delivery themselves (Phase 7a). Build it only if the shop actually wants to own the courier relationship.

- [ ] Decide delivery specifics (Open Item #7b) — service area, fee model, courier, who books the rider, whether returns are delivered
- [ ] Integrate Google Maps SDK + address autocomplete
- [ ] Extend booking form: add delivery alongside pickup + fitting
- [ ] Add address fields to `bookings` (only when delivery chosen)
- [ ] Add delivery fee calculation (flat / distance / pass-through to courier)
- [ ] Admin notifications + queue for delivery requests

**Done when:** customer can choose delivery and admin sees delivery requests in a queue. (Ships in v1.1, after the v1 launch.)

---

## Phase 8 — Operations & Admin Dashboard

Goal: the admin has a single screen showing what needs attention today.

> **Partly delivered early by Phase 4.** The dashboard and the returns flow were built alongside the
> admin shell, because a booking queue with nowhere to send a picked-up booking is not usable. The
> remaining items are the genuinely separate screens.

- [x] Build admin dashboard widgets — `(app)/admin/(tabs)/index.tsx`: Overdue, Today's pickups,
      Today's returns, Pending approvals, Unpaid balances, as five stat cards over one memoised pass.
      Overdue is the only card allowed the red tint, so a clean day reads almost colourless.
  - [x] Today's pickups
  - [x] Today's returns
  - [x] Pending approvals
  - [x] Unpaid balances
  - [x] Overdue rentals
- [ ] Build customer management screen (search + view rental history)
- [x] Build return management flow (mark returned → balance settled → item to "under cleaning" or
      "available") — `(app)/admin/returns.tsx` + `return/[ref].tsx`, in three steps. Flagging
      condition marks the unit damaged. **Caveat:** `markReturned` is three non-atomic client calls
      and wants one DB function.
- [ ] Build payment tracking screen (list of all payments, filterable) — needs the `payments` table (Phase 5)
- [ ] Build audit log viewer (admin actions) — the table and its triggers exist (`0007`); no viewer
- [~] Build rental history screen for customers (past + current) — the Bookings tab has Upcoming and
  Past sections; there is no separate receipts/history screen, and receipts are inert until Phase 5

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
- [ ] **Watch the two assumptions the observed workflow puts at risk:** (a) does the catalog actually
      answer the size question well enough that customers stop needing Messenger? Replacing that
      search is the product's premise, so this is a test of the premise, not of a feature — in-app
      messaging is deliberately out of v1 _and_ v2. (b) does anyone use the app's date-first order,
      or do they still try to pay first?
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
- **Phase 7b (shop-operated delivery) is deferred to v1.1** per the revised scope — out of the v1 critical path entirely. **Phase 7a (customer-arranged courier) is a different question:** it is small, it is already how the business works, and it is the only unmodelled part of the observed workflow. Decide it before Phase 10, not after.
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
| 7a — Customer-arranged courier         | 2–4 days — _if pulled into v1; the decision is the slow part_   |
| 7b — Shop-operated delivery (v1.1)     | 2 weeks — _after v1 launch, not counted above_                  |

Phase 7b (shop-operated delivery) is excluded from the v1 total; Phase 7a is not counted either, since whether it ships in v1 is undecided. Phase 4 absorbed fittings and the concurrency work, so it grew ~1 week while Phase 7 left the v1 critical path — v1 net timeline is roughly unchanged. These estimates assume the open items are resolved on time and don't drift mid-phase.
