# AGENTS.md

This file provides guidance to coding agents (Codex and others) when working with code in this repository. It is kept identical to `CLAUDE.md` apart from this header — update both together.

## Project

Renta — a React Native + Expo mobile app for gown & costume rentals. Customers
browse and book; the shop manages inventory, bookings, payments, and returns.
Single shop in v1. Full plan lives in `project-scope.md`,
`implementation-plan.md`, `tech-stack.md`, and `DESIGN.md` (the design brief the
token layer and every screen are built from) — read these for domain/business
logic questions (booking rules, payment flow, phase sequencing) before assuming.

## Commands

```bash
pnpm install
pnpm ios / pnpm android   # build + run dev client (rebuild required after adding native modules)
pnpm lint                 # ESLint (eslint-config-expo)
pnpm format                # Prettier write — do NOT run after adding a dependency, it reformats pnpm-lock.yaml
pnpm typecheck             # tsc --noEmit
```

There is no test runner configured in this repo (no jest/vitest, no `test` script) —
don't assume one exists. A husky pre-commit hook runs `lint-staged` (eslint --fix +
prettier) on staged files automatically.

Package manager is **pnpm** — never use npm/yarn (`node-linker=hoisted` in `.npmrc`,
so no npm workspace nesting quirks to work around).

`ios/` and `android/` are committed, and both are **out of sync with `app.json`**:
the native projects are still `Rent.xcodeproj` / `com.arnancomia.rent` while
`app.json` says `com.arnancomia.renta`. Harmless in dev, but an `expo prebuild`
is required before an EAS build or a store submission.

## Architecture

**Routing**: `src/app/` is Expo Router (file-based). Route groups: `(auth)` for
signed-out screens (login/signup/OTP/forgot-password), `(app)/(tabs)` for the
signed-in customer tab bar (Home, Browse, Bookings, Profile), and `(app)/admin`
for the shop — which has a tab bar of its own in `(app)/admin/(tabs)` (Dashboard,
Bookings, Items, More) plus returns, fittings, and per-record detail screens.
Admins get a different shell, not the customer tabs. `src/app/_layout.tsx` holds
the `AuthGate` that redirects between these groups based on session state and
role — any new top-level screen needs a group placement that this gate already
understands (see `SESSION_ALLOWED_AUTH_SCREENS` for the auth-group exceptions,
and the `sentToShopFor` ref for the route-on-role-once rule that lets an admin
stay in customer view on purpose).

**Feature modules** (`src/features/<name>/`): a feature owns its own `api.ts`
(data access), `hooks.ts` (TanStack Query wrappers), `types.ts` (domain shapes
distinct from DB row shapes), and `schemas.ts` (Zod, paired with React Hook
Form) — each present as it is actually needed, not as a fixed quartet: `catalog`
and `booking` have no `schemas.ts`; `home` is `api.ts` + `hooks.ts` only. A
feature that grows a second distinct area splits by **area, not by layer**:
`admin` has `api.ts`/`hooks.ts` for the catalog and
`bookings-api.ts`/`bookings-hooks.ts` for the booking queue. Screens and
components never talk to Supabase directly — always through a feature's
`api.ts`/`hooks.ts`.

**Supabase is optional at runtime by design.** `src/lib/supabase.ts` exports
`supabase: SupabaseClient | null` — `null` when `.env` has no
`EXPO_PUBLIC_SUPABASE_*` keys, rather than throwing at import. Feature `api.ts`
files follow one of two patterns depending on whether they write or only read:

- **Read-only** (`features/catalog/api.ts`, `features/home/api.ts`): falls back
  to static `mock-data.ts`, or to a sensible default, when `supabase` is null —
  so the app fully renders offline/without keys. This fallback fires only when
  Supabase is _unconfigured_, **not** when a request _fails_; a paused project
  surfaces the error state instead.
- **Writes** (`features/admin/api.ts`, `features/booking/api.ts`,
  `features/auth/customer.ts`): call `requireDb()` — defined once in
  `src/lib/supabase.ts` — which throws a clear "not configured" error. There's
  no meaningful mock for a mutation.

DB rows are always mapped to domain types inside `api.ts` (snake_case columns →
camelCase fields, e.g. `rental_fee_per_day` → `pricePerDay`) so screens and
components never see the raw schema. When a mapping already exists (e.g.
`mapItem`/`ITEM_SELECT` in `features/catalog/api.ts`), reuse it from the admin
side rather than duplicating — see how `features/admin/api.ts` imports both.

**Auth** (`src/features/auth/auth-context.tsx`): one `AuthProvider` tracks
session, the `customers` row, and the `admins` row (if any) together, each
guarded by a load-id ref so a stale async response from a superseded
session/user can't clobber newer state. `isAdmin` is just `Boolean(admin)` —
admin-gating elsewhere in the app should check this rather than re-querying.
A mutation that already returns the updated customer row should hand it to
`commitCustomer` rather than calling `refreshCustomer()`, which costs a second
round trip. There's a DEV-only `devBypass` escape hatch (`__DEV__`-gated) for
demoing without a real session; never treat it as auth in non-dev logic.

**Booking rules that live in the code, not in the plan docs:**

- A booking is **one item, one date range, one physical unit**. There is no cart
  or bag — a product goes straight into `reserve/`. `cart-context.tsx`,
  `cart-button.tsx` and `bag.tsx` were removed deliberately; don't reintroduce a
  multi-item checkout metaphor the domain doesn't have.
- Double-booking is prevented **at the database level** by the
  `EXCLUDE USING gist` constraint on `bookings` over `(unit_id, blocked_range)`,
  where `blocked_range` covers the rental days plus the cleaning buffer. Never
  check availability with a read-then-write — it isn't safe under concurrency.
  `pick_free_unit()` is `SECURITY DEFINER` because RLS hides other customers'
  bookings, so a client-side freeness check would confidently pick a taken unit.
- The customer calendar (`item_day_states`) is **size-scoped and SECURITY
  DEFINER** — pass the chosen size through `useDayStates`, and remember the
  function must run as definer because RLS would otherwise hide other
  customers' bookings from it and report taken days as free
  (`0017_item_day_states_size.sql`). It is still advisory: the exclusion
  constraint is the arbiter.
- "Today" is a **Manila** calendar day: use `todayManila()` from
  `features/booking/dates.ts`, never `new Date()`. The database checks
  `today_manila()`, so a device-local day can offer a date the DB then refuses.
- Booking status and payment state are **orthogonal** (scope #12) — separate
  fields, separate surfaces, never merged into one badge. Nothing in `bookings`
  should learn about money.

**How the shop actually works today** (field observation, see the Observed
Workflow section of `project-scope.md`) — four places the real flow contradicts
what the code assumes, so check here before designing anything in this area:

- The whole funnel starts in **Facebook Messenger**: the customer asks "what
  size is it", the owner sends photos and sizes by hand. The app's answer to that
  is the catalog and the size guide, not a chat feature — there is deliberately no
  in-app messaging, and adding one is a scope decision (it is a v2 item), not an
  implementation detail.
- **Whoever collects the item is often not the customer.** In practice the
  customer books a Lalamove and a rider arrives at the counter. Nothing in the
  pickup path should assume the person collecting is the account holder — the
  pickup code is what identifies the booking, which is why it is a code and not
  a name. This case is **not modelled yet**: `fulfillment_type` has no value for
  it.
- **Collection can happen before `pickup_date`.** Riders are sometimes booked
  the night before the date the customer needs the item, so the piece physically
  leaves the shop a day early. Anything deriving `blocked_range`, "out now", or
  overdue from `pickup_date` is assuming something the real world does not
  guarantee. Don't tighten date logic against that assumption.
- **How the deposit amount is computed is an open business question.**
  `items.deposit` is a flat per-item number because the schema needed one; the
  shop's real rule was never observed (scope Open Item #2). Every money block in
  the booking flow reads from it, so a change of shape there is not local. Don't
  build a deposit formula until that decision exists.

**Database** (`src/db/*.sql`): numbered, ordered migrations through `0017`,
applied by hand via the Supabase SQL editor (or `supabase db push`) — there is
no migration runner in this repo. When adding a schema change, add the
next-numbered `NNNN_*.sql` file rather than editing a past one. Every table has
row-level security; admin-only writes are gated by an `is_admin()` helper (see
`0006_admins.sql`). Photo storage is a public-read Supabase Storage bucket
(`0008_storage_item_photos.sql`), avatars another (`0015_storage_avatars.sql`).
Editorial home content — shop settings, hero slides, announcements — is
public-read/admin-write in `0016_home_content.sql`, **not yet applied to the dev
project**. Run `get_advisors` after any DDL change: `0012` exists only because
the linter caught a `SECURITY DEFINER` function that `anon` could call.

**Styling**: NativeWind (Tailwind for RN) — see `tailwind.config.js` for the
theme, and `DESIGN.md` for what each token means. `src/components/ui/` holds
generic primitives (button, text-field, tab-bar, status-badge);
`src/components/catalog/`, `src/components/booking/`, `src/components/home/` and
`src/components/admin/` hold feature-specific UI. Prettier auto-sorts Tailwind
classes (`prettier-plugin-tailwindcss`) — don't hand-order them. The app is
**light-only**: `userInterfaceStyle: "light"` plus a fixed theme, and there are
zero `dark:` variants left in `src/`. Don't add one — an ivory-and-bronze
product has no honest inversion.

**State**: TanStack Query for server state (client in `src/lib/query-client.ts`
— 1 min staleTime / 5 min gcTime as the _default_; features override it where
the data is slower, e.g. 1 hour for home content, 15s for calendar day states).
Client-only state is React context — `AuthProvider`, and `BookingProvider` for
the in-progress booking draft. **There is no Zustand and no Redux**; despite the
recommendation in `tech-stack.md`, Zustand was never installed. The persisted
auth session uses MMKV (`react-native-mmkv`), not AsyncStorage.

**Path alias**: `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`).

## Environment

Only `EXPO_PUBLIC_*` vars belong in `.env` (inlined into the client bundle).
Secrets (Supabase service-role key, PayMongo secret key, Resend/SMS keys) must
never go here — they belong in Supabase edge-function secrets. See `README.md`
for the full one-time Supabase dashboard setup (email confirmation, phone OTP
provider, reset-password email template, admin bootstrap via invite code).
