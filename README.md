# Rent

Mobile app for gown & costume rentals — customers browse and reserve; the shop
manages inventory, bookings, payments, and returns. Single shop in v1.

See [`project-scope.md`](./project-scope.md), [`implementation-plan.md`](./implementation-plan.md),
and [`tech-stack.md`](./tech-stack.md) for the full plan.

## Stack

React Native + Expo (Expo Router, TypeScript) · Supabase (Postgres, Auth,
Storage, Edge Functions) · NativeWind · TanStack Query + Zustand · PayMongo ·
Resend · Sentry.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your keys (see below)
npm run ios            # or: npm run android
```

### Environment

Only `EXPO_PUBLIC_*` values belong in `.env` — they are inlined into the app
bundle. **Never** put secrets (Supabase service-role key, PayMongo secret key,
Resend/SMS keys) here; those live in Supabase edge-function secrets.

| Var                             | Where to get it                             |
| ------------------------------- | ------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API           |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API           |
| `EXPO_PUBLIC_SENTRY_DSN`        | Sentry → Project Settings (optional in dev) |

The app boots without `.env`; the home screen shows connection status so you can
verify each service once its keys are in.

## Scripts

| Command                           | Does                                   |
| --------------------------------- | -------------------------------------- |
| `npm run ios` / `npm run android` | Start Metro + open on simulator/device |
| `npm run lint`                    | ESLint                                 |
| `npm run format`                  | Prettier write                         |
| `npm run typecheck`               | `tsc --noEmit`                         |

A pre-commit hook (husky + lint-staged) auto-lints and formats staged files.

## Project layout

```
src/
  app/         Expo Router routes (file-based)
  components/  Shared UI
  features/    Feature modules (auth, catalog, booking, …)
  lib/         Clients & config (supabase, sentry, env)
  db/          SQL migrations / schema
  hooks/       Shared hooks
  constants/   Theme & constants
```

## Builds

EAS Build profiles are in [`eas.json`](./eas.json): `development` (dev client),
`preview` (internal distribution), `production`. Run
`npx eas build --profile development`.
