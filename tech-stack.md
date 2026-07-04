# RENT APP — Tech Stack

Tech stack tuned to the project decisions: mobile-first, single dev or small team, PH market, hybrid payments, photo-heavy catalog.

## Recommended Stack

| Layer                         | Choice                                                        | Why                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile app (customer + admin) | **React Native + Expo**                                       | One codebase for iOS + Android. Expo handles push, builds, OTA updates, and has the gentlest setup. Easier to ship solo than Flutter if you're stronger in JS/TS.                                     |
| Backend-as-a-service          | **Supabase**                                                  | Postgres (real relational data — important for bookings/availability), auth, file storage, row-level security, edge functions, realtime. Generous free tier. Avoids building a custom backend for v1. |
| Database                      | **Postgres** (via Supabase)                                   | Booking/availability logic needs joins, date-range queries, and transactional integrity — relational beats Firestore here.                                                                            |
| Payments                      | **PayMongo**                                                  | PH-focused: GCash, GrabPay, Maya, cards, bank transfer. Webhook-driven. Good docs. Xendit is the strong alternative if you want broader SEA coverage later.                                           |
| Push notifications            | **Expo Push**                                                 | Wraps FCM + APNs with one API; integrates directly with Expo.                                                                                                                                         |
| Email                         | **Resend**                                                    | Clean API, generous free tier, React-based templates. Good fit if you might add SMS later via a separate provider.                                                                                    |
| Image storage                 | **Supabase Storage**                                          | Already in Supabase; CDN included. Switch to **Cloudinary** later if you need on-the-fly transforms/optimization for the catalog.                                                                     |
| Maps (for delivery)           | **Google Maps SDK**                                           | Address autocomplete + route preview. Bake in a Lalamove or Borzo SDK call later if you go pass-through delivery.                                                                                     |
| Auth                          | **Supabase Auth**                                             | Email + password, phone OTP for KYC (Open Item #6), social login if needed.                                                                                                                           |
| State management              | **TanStack Query** (server) + **Zustand** (client)            | TanStack Query handles caching/refetch for catalog and bookings; Zustand for UI state. Skip Redux.                                                                                                    |
| Forms                         | **React Hook Form + Zod**                                     | Type-safe schemas, used across signup, booking, admin item editor.                                                                                                                                    |
| Date handling                 | **date-fns** + a calendar lib like **react-native-calendars** | Availability UI is calendar-heavy — pick a battle-tested calendar component early.                                                                                                                    |
| CI / build                    | **EAS Build** (Expo)                                          | Cloud builds for iOS without owning a Mac CI.                                                                                                                                                         |

## What to skip

- **A separate backend (Node/Express, Django, etc.)** — overkill for v1. Supabase edge functions cover the few cases where you can't do it client-side (e.g., PayMongo webhooks, sending email, secret-protected logic).
- **Redux** — TanStack Query + Zustand is enough.
- **Custom design system / UI kit from scratch** — use **NativeWind** (Tailwind for RN) + headless components (e.g., **React Native Reusables** or **Tamagui**). Saves weeks.
- **Microservices / Docker / Kubernetes** — none of this is justified at v1 scale.

## Tradeoff Worth Flagging

The decision was **mobile admin**, which keeps the stack consistent (one RN codebase). The downside: editing 30-item bulk inventory, uploading 10 photos at once, or reading reports on a phone is painful. Two realistic options:

1. **Keep admin mobile, accept the friction.** Fine for a single-shop owner who's always on their phone anyway.
2. **Add a thin web admin later** using the same Supabase backend (Next.js or just plain React + Vite + the same TanStack Query setup). No backend duplication. Worth considering for v1.1 once admin pain points surface.

## Data Layer Sketch

Concrete shape of the Postgres schema (Supabase):

- `items` (id, name, category, deposit, rental_fee, cleaning_buffer_days, photos[])
- `item_units` (id, item_id, size, status) — populated only if the "design + units" inventory model is chosen (Open Item #1)
- `bookings` (id, customer_id, item_id or unit_id, pickup_date, return_date, status, fulfillment_type, address, fitting_at)
- `payments` (id, booking_id, type [deposit/balance/refund/penalty], amount, paymongo_payment_id, paid_at)
- `notifications`, `audit_log`, `customers`, `admins`

All Postgres with foreign keys + row-level security policies in Supabase.
