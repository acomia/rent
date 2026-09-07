# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Renta — a React Native + Expo mobile app for gown & costume rentals. Customers
browse and book; the shop manages inventory, bookings, payments, and returns.
Single shop in v1. Full plan lives in `project-scope.md`,
`implementation-plan.md`, and `tech-stack.md` — read these for domain/business
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

## Architecture

**Routing**: `src/app/` is Expo Router (file-based). Route groups: `(auth)` for
signed-out screens (login/signup/OTP/forgot-password), `(app)/(tabs)` for the
signed-in customer tab bar, `(app)/admin` for the admin catalog area. `src/app/_layout.tsx`
holds the `AuthGate` that redirects between these groups based on session state —
any new top-level screen needs a group placement that this gate already understands
(see `SESSION_ALLOWED_AUTH_SCREENS` for the auth-group exceptions).

**Feature modules** (`src/features/<name>/`): each feature owns its own
`api.ts` (data access), `hooks.ts` (TanStack Query wrappers), `schemas.ts` (Zod,
paired with React Hook Form), and `types.ts` (domain shapes distinct from DB row
shapes). Screens/components never talk to Supabase directly — always through a
feature's `api.ts`/`hooks.ts`.

**Supabase is optional at runtime by design.** `src/lib/supabase.ts` exports
`supabase: SupabaseClient | null` — `null` when `.env` has no
`EXPO_PUBLIC_SUPABASE_*` keys, rather than throwing at import. Feature `api.ts`
files follow one of two patterns depending on whether they write or only read:

- **Read-only** (`features/catalog/api.ts`): falls back to static `mock-data.ts`
  when `supabase` is null, so the app fully renders offline/without keys.
- **Writes** (`features/admin/api.ts`): calls `requireDb()` which throws a clear
  "not configured" error — there's no meaningful mock for a mutation.

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
There's a DEV-only `devBypass` escape hatch (`__DEV__`-gated) for demoing
without a real session; never treat it as auth in non-dev logic.

**Database** (`src/db/*.sql`): numbered, ordered migrations, applied by hand via
the Supabase SQL editor (or `supabase db push`) — there is no migration runner
in this repo. When adding a schema change, add the next-numbered `NNNN_*.sql`
file rather than editing a past one. Every table has row-level security;
admin-only writes are gated by an `is_admin()` helper (see `0006_admins.sql`).
Photo storage is a public-read Supabase Storage bucket (`0008_storage_item_photos.sql`).

**Styling**: NativeWind (Tailwind for RN) — see `tailwind.config.js` for the
theme. `src/components/ui/` holds generic primitives (button, text-field,
tab-bar); `src/components/catalog/` and `src/components/admin/` hold
feature-specific UI. Prettier auto-sorts Tailwind classes
(`prettier-plugin-tailwindcss`) — don't hand-order them.

**State**: TanStack Query for server state (client in `src/lib/query-client.ts`,
1 min staleTime / 5 min gcTime — catalog data is treated as slow-changing),
Zustand for client-only UI state where needed. No Redux.

**Path alias**: `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`).

## Environment

Only `EXPO_PUBLIC_*` vars belong in `.env` (inlined into the client bundle).
Secrets (Supabase service-role key, PayMongo secret key, Resend/SMS keys) must
never go here — they belong in Supabase edge-function secrets. See `README.md`
for the full one-time Supabase dashboard setup (email confirmation, phone OTP
provider, reset-password email template, admin bootstrap via invite code).
