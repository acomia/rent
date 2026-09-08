# RENT APP — Tech Stack

Tech stack tuned to the project decisions: mobile-first, single dev or small team, PH market, hybrid payments, photo-heavy catalog.

> **This is the original recommendation, kept for its reasoning.** Several rows were
> not followed once the code met reality — see **As built** at the end for what is
> actually installed. Where the two disagree the code wins; `package.json` is the
> source of truth.

## Recommended Stack

| Layer                         | Choice                                                        | Why                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile app (customer + admin) | **React Native + Expo**                                       | One codebase for iOS + Android. Expo handles push, builds, OTA updates, and has the gentlest setup. Easier to ship solo than Flutter if you're stronger in JS/TS.                                       |
| Backend-as-a-service          | **Supabase**                                                  | Postgres (real relational data — important for bookings/availability), auth, file storage, row-level security, edge functions, realtime. Generous free tier. Avoids building a custom backend for v1.   |
| Database                      | **Postgres** (via Supabase)                                   | Booking/availability logic needs joins, date-range queries, and transactional integrity — relational beats Firestore here.                                                                              |
| Payments                      | **PayMongo**                                                  | PH-focused: GCash, GrabPay, Maya, cards, bank transfer. Webhook-driven. Good docs. Xendit is the strong alternative if you want broader SEA coverage later.                                             |
| Push notifications            | **Expo Push**                                                 | Wraps FCM + APNs with one API; integrates directly with Expo.                                                                                                                                           |
| Email                         | **Resend**                                                    | Clean API, generous free tier, React-based templates. Good fit if you might add SMS later via a separate provider.                                                                                      |
| Image storage                 | **Supabase Storage**                                          | Already in Supabase; CDN included. Switch to **Cloudinary** later if you need on-the-fly transforms/optimization for the catalog.                                                                       |
| Maps (for delivery)           | **Google Maps SDK**                                           | Address autocomplete + route preview. Bake in a Lalamove or Borzo SDK call later if you go pass-through delivery. _(Deferred with delivery to v1.1. v1 only opens the shop's `map_url` via `Linking`.)_ |
| Auth                          | **Supabase Auth**                                             | Email + password, phone OTP for KYC (Open Item #6), social login if needed.                                                                                                                             |
| State management              | **TanStack Query** (server) + **Zustand** (client)            | TanStack Query handles caching/refetch for catalog and bookings; Zustand for UI state. Skip Redux. _(Not followed: Zustand was never installed — client state is React context. See As built.)_         |
| Forms                         | **React Hook Form + Zod**                                     | Type-safe schemas, used across signup, booking, admin item editor.                                                                                                                                      |
| Date handling                 | **date-fns** + a calendar lib like **react-native-calendars** | Availability UI is calendar-heavy — pick a battle-tested calendar component early. _(Not followed: both were rejected. See As built.)_                                                                  |
| CI / build                    | **EAS Build** (Expo)                                          | Cloud builds for iOS without owning a Mac CI.                                                                                                                                                           |

## What to skip

- **A separate backend (Node/Express, Django, etc.)** — overkill for v1. Supabase edge functions cover the few cases where you can't do it client-side (e.g., PayMongo webhooks, sending email, secret-protected logic).
- **Redux** — TanStack Query + Zustand is enough.
- **Custom design system / UI kit from scratch** — use **NativeWind** (Tailwind for RN) + headless components (e.g., **React Native Reusables** or **Tamagui**). Saves weeks. _(Half-followed: NativeWind yes, the component kits no — `DESIGN.md` is specific enough that hand-built primitives in `src/components/ui/` were cheaper than fighting a kit's opinions. `@expo/ui` covers native form controls.)_
- **Microservices / Docker / Kubernetes** — none of this is justified at v1 scale.

## Tradeoff Worth Flagging

The decision was **mobile admin**, which keeps the stack consistent (one RN codebase). The downside: editing 30-item bulk inventory, uploading 10 photos at once, or reading reports on a phone is painful. Two realistic options:

1. **Keep admin mobile, accept the friction.** Fine for a single-shop owner who's always on their phone anyway.
2. **Add a thin web admin later** using the same Supabase backend (Next.js or just plain React + Vite + the same TanStack Query setup). No backend duplication. Worth considering for v1.1 once admin pain points surface.

## Data Layer Sketch

> Superseded by the real schema in `src/db/*.sql` (migrations `0001`–`0016`).
> Kept as a record of the original intent. Of the tables below, `items`,
> `item_units`, `bookings`, `customers`, `admins` and the audit log are built;
> **`payments` and `notifications` do not exist yet** (Phases 5 and 6). The
> `address` column on `bookings` was never added — delivery is v1.1.

Concrete shape of the Postgres schema (Supabase):

- `items` (id, name, category, deposit, rental_fee, cleaning_buffer_days, photos[])
- `item_units` (id, item_id, size, status) — populated only if the "design + units" inventory model is chosen (Open Item #1)
- `bookings` (id, customer_id, item_id or unit_id, pickup_date, return_date, status, fulfillment_type, address, fitting_at)
- `payments` (id, booking_id, type [deposit/balance/refund/penalty], amount, paymongo_payment_id, paid_at)
- `notifications`, `audit_log`, `customers`, `admins`

All Postgres with foreign keys + row-level security policies in Supabase.

## As Built

What is actually installed as of Phase 4, where it diverges from the table above.
`package.json` is the source of truth; this section explains the _why_.

| Layer         | Recommended                      | As built                                                                    | Why it changed                                                                                                                                                                                                        |
| ------------- | -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client state  | Zustand                          | **React context** (`AuthProvider`, `BookingProvider`)                       | Zustand was never installed. The only real client state is the in-progress booking draft, which is scoped to one flow and dies with it — a store outliving the screens that own it would have been the wrong shape.   |
| Session store | (AsyncStorage implied)           | **MMKV** (`react-native-mmkv`)                                              | Synchronous, so Supabase's storage interface takes it directly with no async shim.                                                                                                                                    |
| Dates         | date-fns                         | **`src/features/booking/dates.ts`** (hand-rolled)                           | Every date in this app is a _Manila calendar day_ carried as a `'YYYY-MM-DD'` key, not an instant. That is a narrow enough contract that a general date library mostly gets in the way — `todayManila()` uses `Intl`. |
| Calendar UI   | react-native-calendars           | **`src/components/booking/month-calendar.tsx`**                             | The calendar has to render six inventory states with a legend, per `DESIGN.md`, and the design is the product here. Theming a library to match was more work than drawing the grid.                                   |
| UI kit        | React Native Reusables / Tamagui | **NativeWind + `src/components/ui/`** primitives, plus `@expo/ui` for forms | See "What to skip" above.                                                                                                                                                                                             |
| Fonts         | —                                | **Playfair Display + Inter** (`@expo-google-fonts/*`)                       | Per `DESIGN.md`. `@expo-google-fonts/poppins` is still in `package.json` but referenced nowhere — a leftover of the Phase 3.5 rebrand, safe to remove.                                                                |
| Icons         | —                                | **`@expo/vector-icons`** (Feather)                                          | Single-weight rounded line icons from one family, per the design brief.                                                                                                                                               |
| Images        | —                                | **`expo-image`**                                                            | Caching and transitions matter on a photo-heavy catalog over PH connectivity.                                                                                                                                         |
| Animation     | —                                | **`react-native-reanimated`**                                               | Used sparingly (the rental band, sheets). The Home screen's collapsing header was removed rather than kept animated.                                                                                                  |
| Payments      | PayMongo                         | **not wired** — screens are UI stand-ins                                    | Phase 5. This is now a hard dependency: RLS gives the client no path to mark its own deposit paid, so bookings can only be created `pending` until the webhook exists.                                                |
| Email / SMS   | Resend / Semaphore or Twilio     | **not wired**                                                               | Phase 6. Phone OTP does go through Supabase Auth's SMS provider, which is dashboard config rather than a dependency.                                                                                                  |
| Maps          | Google Maps SDK                  | **`expo-linking` + a `map_url` column**                                     | v1 has no delivery, so nothing needs a map _in_ the app — "Visit store" opens the shop's own maps link from `shop_settings`.                                                                                          |
| QR at pickup  | —                                | **not installed** — the pickup screen draws a placeholder                   | Needs `react-native-qrcode-svg` + `react-native-svg`.                                                                                                                                                                 |
| Tests         | —                                | **none**                                                                    | No jest/vitest and no `test` script. DB-level booking logic was verified with behavioural SQL against the dev project; client-side pricing in `features/booking/pricing.ts` remains unverified.                       |
