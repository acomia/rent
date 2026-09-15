# Phase 5 — Payments (Online Deposit) — Design Spec

**Date:** 2026-09-14
**Status:** Approved — writing implementation plan next
**Reference:** `implementation-plan.md` Phase 5, `project-scope.md` Open Items #2 and #4

## Goal

A booking is only confirmed once the deposit is paid online through PayMongo. Today
`bookings` can only ever be created `pending` with nothing paid (Phase 4 explicitly stopped
short of this). This phase wires the `payments` table, a PayMongo Payment Intent + webhook
integration, and the admin money actions (refund, record balance paid, manual penalty) that
depend on it.

## Decisions (confirmed with user)

- **Deposit computation (Open Item #2):** stays a flat, admin-set number per item
  (`items.deposit`, unchanged). No schema change. Revisit once a real shop is signed on and
  the actual rule is observed.
- **Customer-initiated cancellation refund (Open Item #4):** no refund, ever. The deposit is
  always forfeited. Simplest rule, matches how deposits already work in practice.
- **Shop-initiated rejection/cancellation:** always refunded automatically, in full. By the
  time an admin can reject or cancel a booking, the customer has already paid — they are not
  at fault, so the deposit always comes back.
- **Gateway fees on a refund:** the shop absorbs them. The customer always gets the full
  deposit amount back; PayMongo's processing fee on the original charge is not clawed back
  from the refund. (This only affects bookkeeping, not the refund API call — PayMongo refunds
  the amount requested, up to the original charge.)
- **PayMongo test account:** does not exist yet. This spec and the implementation plan can
  proceed — everything up to actually exercising a live sandbox call is buildable now — but no
  part of this integration can be _tested end-to-end_ until the account and test-mode keys
  exist. Flagged again at the end of this document.

## Architecture

### The hold-vs-pay-first fork

Phase 4 already built the scaffolding for a real checkout hold — `bookings.status = 'hold'`,
`hold_expires_at`, `expire_stale_holds()`, and a customer-facing hold screen with a countdown
(`reserve/hold.tsx`) — but nothing uses it: the hold screen fakes a local 15-minute timer, and
`reserve/processing.tsx` inserts the booking directly as `pending`, with no payment involved.

This phase turns that on: the booking becomes a real `hold` row **before** the customer pays,
not after. The alternative — insert nothing until the webhook confirms payment, and skip the
hold machinery entirely — would be simpler (no `pg_cron`, no hold-conflict edge case), but it
leaves the already-built hold screen dead code and contradicts the plan's own "closes with
Phase 5" note on the hold scaffolding. Going with the hold-based flow.

### New pieces

- **`payments` table** (migration `0019`) — the only place money state lives; `bookings` still
  learns nothing about it.
- **Two Supabase Edge Functions** (`supabase/functions/` — none exist in this repo yet):
  `create-payment-intent` and `paymongo-webhook`. A third, `admin-refund-booking`, covers the
  admin-triggered refund path (reject / shop-cancel).
- **`pg_cron`**, enabled and scheduled to actually run `expire_stale_holds()` — today it exists
  but nothing ever calls it, so holds would never expire.

Secrets (`PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`) live only as edge function secrets,
never in `.env`. The one client-visible key, `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`, is safe to embed
— PayMongo's public key is designed for client-side use (creating a Payment Method, attaching it
to an intent via its `client_key`).

## Schema (migration `0019`)

```
payments
  id                          uuid pk
  booking_id                  uuid not null references bookings(id) on delete restrict
  type                        text not null check (type in ('deposit','balance','penalty'))
  amount                      numeric(10,2) not null check (amount >= 0)
  status                      text not null check (status in
                                ('processing','paid','failed','refunded','forfeited'))
  paymongo_payment_intent_id  text
  paymongo_payment_id         text
  paid_at                     timestamptz
  refunded_at                 timestamptz
  refund_reason               text
  created_at / updated_at     timestamptz (reuse set_updated_at())
```

- Partial unique index on `booking_id` where `type = 'deposit' and status = 'processing'` — at
  most one deposit payment may be in flight per booking, so a double-tap on "Pay" can't spawn
  two intents; `create-payment-intent` checks for and reuses an existing in-flight row instead.
- `payment_events (id text primary key, received_at timestamptz)` — dedupes webhook deliveries
  by PayMongo's event id. RLS enabled, no policies (deny-all, same pattern as
  `admin_invite_codes`) — only the webhook's service-role client ever touches it.
- **RLS on `payments`:** customer selects rows for their own bookings (via a join/EXISTS against
  `bookings.customer_id`); admin selects all; admin may **insert** rows where
  `type in ('balance', 'penalty')` only — deposit rows and any transition to `paid`/`refunded`
  never go through a client-held session, only through the service-role edge functions (which
  bypass RLS regardless — the check exists to keep the admin UI itself from doing something a
  human tapped by mistake, not as the real security boundary).
- **`expire_stale_holds()` amendment:** add
  `and not exists (select 1 from payments p where p.booking_id = b.id and p.status = 'processing')`
  to the sweep's `where` clause, so a hold with a payment actually in flight survives past
  `hold_expires_at` until the webhook resolves it either way. Without this, a slow gateway
  redirect could get its slot swept out from under an in-flight charge.
- **Forfeiture trigger:** `after update on bookings`, when `status` becomes `cancelled` and the
  actor is a customer (`auth.uid() is not null and not is_admin()`), flip any `paid` deposit
  payment for that booking to `forfeited`. No PayMongo call needed — forfeiture is bookkeeping
  only, so it's DB-enforced rather than routed through an edge function. This is the mechanical
  counterpart to "no refund ever": nothing about it required another round-trip to a business
  decision, just wiring.
- `pg_cron`: `create extension if not exists pg_cron` (Supabase project-level), then
  `select cron.schedule('expire-holds', '* * * * *', 'select public.expire_stale_holds();')`.

## Edge Functions

### `create-payment-intent`

Called when the customer taps "Pay" on `reserve/payment.tsx`. Input: `{ bookingId }`, caller's
JWT forwarded.

1. Read the booking through a Supabase client built from the caller's own JWT — this reuses
   `bookings_select_own_or_admin` RLS, so a customer can only ever create an intent for their
   own hold, no extra ownership check needed.
2. Reject (409) if `status !== 'hold'` or `hold_expires_at` has passed.
3. Check for an existing `processing` deposit `payments` row for this booking (service-role
   client); if one exists and its intent is still usable, return its `client_key` unchanged
   (idempotent retry — e.g. the customer backgrounded the app mid-payment and came back).
4. Otherwise, call PayMongo's `POST /v1/payment_intents` (secret key, amount = the item's
   deposit in centavos, currency `PHP`, `payment_method_allowed: [card, gcash, grab_pay,
paymaya]`, `metadata: { booking_id, reference }`), insert the `payments` row (`processing`),
   and return `{ clientKey, paymentIntentId }`.

### `paymongo-webhook`

Public endpoint (PayMongo calls it directly — no user JWT). Verifies PayMongo's signature header
against `PAYMONGO_WEBHOOK_SECRET` before touching anything; the exact header name and signing
algorithm should be re-confirmed against PayMongo's current docs at implementation time rather
than assumed here.

1. Insert the event id into `payment_events` first — a unique-violation means this delivery was
   already processed, so return `200` immediately without reprocessing (webhooks retry and can
   arrive twice or out of order).
2. Look up the `payments` row by `paymongo_payment_intent_id`.
3. **`payment.paid`:** mark the payment `paid` (`paymongo_payment_id`, `paid_at`), then update
   the booking `hold → pending` **only where it is still `hold`**. If that update affects 0 rows
   (the hold was already swept — the rare case the "skip while processing" guard doesn't fully
   close, e.g. an unusually slow webhook), call PayMongo's refund API for the full amount instead
   and mark the payment `refunded` with a reason noting the hold had already expired.
4. **`payment.failed`:** mark the payment `failed`. Deliberately leave the hold running — the
   customer can retry with a different method before the countdown actually runs out, rather
   than losing the slot on a single declined card.

### `admin-refund-booking`

Called by the admin app in place of a direct table update, for the `reject` and `cancel`
actions only (`approve` and `mark_picked_up` move no money and are unchanged). Input:
`{ reference, action, reason }`, admin's JWT forwarded and checked via `is_admin()`.

1. Fetch the booking and its `paid` deposit payment (service role).
2. If a paid deposit exists, call PayMongo's refund API for the full amount, mark the payment
   `refunded`.
3. Transition the booking (`rejected` with `rejection_reason`, or `cancelled`) in the same
   function call — so a booking can never end up rejected/shop-cancelled with an unrefunded
   deposit, which it could if these were two separate client calls.

## App-side changes

- `features/booking/types.ts` / `booking-context.tsx`: `BookingDraft` gains `bookingId`,
  `reference`, `holdExpiresAt`, set once by a new `setHold()` action.
- `features/booking/api.ts`: `createBooking` → `createHold` — same `pick_free_unit` call as
  today, but inserts `status: 'hold'` with a `hold_expires_at`. New `createPaymentIntent
(bookingId)` wrapping `supabase.functions.invoke('create-payment-intent', ...)`.
- `reserve/hold.tsx`: calls `useCreateHold()` once on mount (same guarded-ref pattern
  `processing.tsx` already uses for its mutation), stores the result via `setHold`, and derives
  the countdown from the real `hold_expires_at` each tick (`Math.max(0, Math.floor((holdExpiresAt
  - Date.now()) / 1000))`) instead of the current hardcoded `HOLD_SECONDS` constant — a real hold
    needs to agree with the server's clock, not the client's.
- `reserve/payment.tsx`: on "Pay", calls `createPaymentIntent`, creates a PayMongo Payment Method
  client-side (direct call using `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` — safe, that's what it's for),
  attaches it to the intent via the intent's `client_key` (also safe client-side by PayMongo's
  design), then opens the resulting redirect with `WebBrowser.openAuthSessionAsync` (already a
  dependency — no new native module). No new deep-link route is needed: the promise resolves
  back in this same screen once the browser redirects to the app's `renta://` scheme.
- `reserve/processing.tsx`: no longer creates the booking (that already happened as the hold).
  Instead it polls a lightweight booking-status query (~2s interval) until the status leaves
  `hold`: moved to `pending` → success; still `hold` past a timeout (~45s) → a distinct "still
  confirming, we'll let you know" state, not an error, since the webhook may simply be slow;
  otherwise → the existing failure state, with retry routed back to `payment.tsx` (the hold and
  slot are still valid, no need to reselect dates).
- `reserve/success.tsx`: "View receipt" becomes enabled, pointing at a new in-app receipt screen
  reading the booking's `payments` rows. Text only — no PDF, no email (Phase 9).

## Admin-side changes

- `features/admin/bookings-api.ts`: `updateBookingStatus` routes `reject`/`cancel` through
  `admin-refund-booking` instead of a direct `.update()`; `approve`/`mark_picked_up` unchanged.
- New `recordBalancePaid(reference, amount)` and `recordPenalty(reference, amount, note)` —
  plain admin-gated inserts into `payments` (no gateway, no edge function), surfaced as new
  actions on `booking/[ref].tsx`.

## Explicitly out of scope

- Resend email receipts and PDF receipt generation — Phase 9.
- Automated penalty formula — v2 (Open Item #5); v1 stays admin-entered amounts only.
- Shop-operated delivery / courier — Phase 7.
- Redesigning around the deposit-before-dates flow-order mismatch — the plan already says this
  is worth watching in the beta, not solving now.

## Testing approach

No test runner exists in this repo (unchanged). Following the Phase 4 precedent:

- DB-level logic (hold-sweep skip while a payment is processing, the forfeiture trigger, RLS —
  a customer cannot insert a `paid` deposit row or read another customer's payments, admin can
  insert `balance`/`penalty` but not `deposit`) — verified with behavioural SQL in
  self-rolling-back transactions against the live dev project, as Phase 4's availability and
  buffer math was.
- The edge functions — verified with `curl` against PayMongo's documented test-mode payloads,
  once test-mode keys exist. Blocked today on the account.
- The client flow (hold countdown accuracy, the payment redirect round-trip, the processing
  screen's poll/timeout/failure states) needs a manual device walkthrough once keys exist — same
  "unverified on device" caveat that already applies to the rest of the reserve flow.

## Open follow-ups / risks

- **PayMongo test account is a real prerequisite**, not just a nice-to-have — nothing in this
  phase can be exercised end-to-end until it exists. Everything up to that point is still worth
  building now.
- The exact webhook payload shape and signature-verification scheme should be re-checked against
  PayMongo's current docs when writing `paymongo-webhook` — this spec designs against their
  documented Payment Intent + webhook model, but field names deserve a docs check at
  implementation time rather than being hardcoded from memory here.
- `WebBrowser.openAuthSessionAsync`'s behavior with each of GCash/GrabPay/Maya's actual redirect
  pages hasn't been visually confirmed. Worth an early spike once test keys exist, before betting
  the rest of the flow on it.
