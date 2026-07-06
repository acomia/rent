# Hiramda

Mobile app for gown & costume rentals — customers browse and reserve; the shop
manages inventory, bookings, payments, and returns. Single shop in v1.

See [`project-scope.md`](./project-scope.md), [`implementation-plan.md`](./implementation-plan.md),
and [`tech-stack.md`](./tech-stack.md) for the full plan.

## Stack

React Native + Expo (Expo Router, TypeScript) · Supabase (Postgres, Auth,
Storage, Edge Functions) · NativeWind · TanStack Query + Zustand · PayMongo ·
Resend.

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in your keys (see below)
pnpm ios               # or: pnpm android
```

### Environment

Only `EXPO_PUBLIC_*` values belong in `.env` — they are inlined into the app
bundle. **Never** put secrets (Supabase service-role key, PayMongo secret key,
Resend/SMS keys) here; those live in Supabase edge-function secrets.

| Var                             | Where to get it                   |
| ------------------------------- | --------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |

The app boots without `.env`; the home screen shows connection status so you can
verify each service once its keys are in.

### Backend setup (Phase 1 — Auth)

Auth needs one-time setup in the Supabase dashboard before signup/login work:

1. **Run the migration** — paste [`src/db/0001_customers.sql`](./src/db/0001_customers.sql)
   into the SQL editor (or `supabase db push`). Creates the `customers` table,
   the signup-provisioning trigger, and row-level security.
2. **Auth → Providers → Email** — turn **off** "Confirm email". Verification in
   v1 is by phone OTP, so signup must return a session immediately for the OTP
   step to run.
3. **Auth → Providers → Phone** — connect an SMS provider (Twilio / MessageBird /
   Vonage). Until this is set, phone OTP can't send — use the **dev-only "Skip
   verification"** button on the OTP screen to test the rest of the flow.
4. **Auth → Emails → Reset password** — the forgot-password flow is recovery-OTP
   based, so the email **must** include `{{ .Token }}` (the 6-digit code the app
   asks for). The Supabase default template only sends a `{{ .ConfirmationURL }}`
   link, **not** a code — so you must edit the "Message body" to include the
   token, e.g.:

   ```html
   <h2>Reset your password</h2>
   <p>Enter this 6-digit code in the app to reset your password:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">
     {{ .Token }}
   </p>
   <p>
     This code expires in 1 hour. If you didn't request it, ignore this email.
   </p>
   ```

   Without `{{ .Token }}` in the template, the reset screen has no code to enter
   and the flow cannot complete.

### Backend setup (Phase 3 — Admin catalog)

The admin catalog management area needs the migrations plus one way to create an admin:

1. **Run the migrations** in order in the SQL editor (or `supabase db push`):
   - [`src/db/0006_admins.sql`](./src/db/0006_admins.sql) — `admins` table, the
     `is_admin()` helper, and admin-only write policies on the catalog tables.
   - [`src/db/0007_admin_audit_log.sql`](./src/db/0007_admin_audit_log.sql) —
     `admin_audit_log` + DB triggers that record every catalog mutation.
   - [`src/db/0008_storage_item_photos.sql`](./src/db/0008_storage_item_photos.sql) —
     the public-read `item-photos` Storage bucket + admin-only write policies.
   - [`src/db/0009_admin_invite_codes.sql`](./src/db/0009_admin_invite_codes.sql) —
     `admin_invite_codes` + the invite-gated signup trigger + verify RPC.
2. **Create an admin.** Two options:

   - **Invite code (in-app):** mint a code, then sign up choosing **Shop** and
     entering it. The signup trigger creates the admin row only for a valid,
     active code (an invalid code fails the signup). Mint one with a long, random
     value — it is a shared secret:

     ```sql
     insert into public.admin_invite_codes (code, role, note)
     values ('<LONG-RANDOM-STRING>', 'owner', 'shop owner');
     ```

     Revoke a code by setting `active = false`. Codes are reusable while active.

   - **By hand (bootstrap):** insert the `admins` row directly for a user id from
     **Auth → Users**:

     ```sql
     insert into public.admins (id) values ('<auth-user-uuid>');
     ```

   Either way the account then sees an **Admin** entry on its Profile screen. The
   owner/staff `role` defaults to `owner`; the staff split is a later phase.

> Photo upload adds the native `expo-image-picker` module, so after pulling this
> phase you must **rebuild the dev client** (`pnpm ios` / `pnpm android`) — a JS
> reload is not enough.

## Scripts

| Command                     | Does                                   |
| --------------------------- | -------------------------------------- |
| `pnpm ios` / `pnpm android` | Start Metro + open on simulator/device |
| `pnpm lint`                 | ESLint                                 |
| `pnpm format`               | Prettier write                         |
| `pnpm typecheck`            | `tsc --noEmit`                         |

A pre-commit hook (husky + lint-staged) auto-lints and formats staged files.

## Project layout

```
src/
  app/         Expo Router routes (file-based)
  components/  Shared UI
  features/    Feature modules (auth, catalog, booking, …)
  lib/         Clients & config (supabase, env)
  db/          SQL migrations / schema
  hooks/       Shared hooks
  constants/   Theme & constants
```

## Builds

EAS Build profiles are in [`eas.json`](./eas.json): `development` (dev client),
`preview` (internal distribution), `production`. Run
`npx eas build --profile development`.
