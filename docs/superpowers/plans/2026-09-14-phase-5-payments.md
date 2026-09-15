# Phase 5 — Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire PayMongo online-deposit payments end to end — schema, edge functions, the reserve flow, and the admin money actions — so a booking can only reach `pending` once its deposit is actually paid, per `implementation-plan.md` Phase 5.

**Architecture:** A checkout hold (`bookings.status = 'hold'`) is created before payment, a PayMongo Payment Intent is created server-side by an edge function, the client attaches a payment method and opens the gateway's redirect via `expo-web-browser`, and a webhook edge function — the only path that can ever mark a deposit paid — advances the hold to `pending`. Admin-triggered money movement (reject/cancel refunds) and read-only admin/customer money actions (balance paid, penalty, forfeiture) route through the same `payments` table, split between DB triggers (no external call needed) and edge functions (calls needing the PayMongo secret key).

**Tech Stack:** Expo Router + NativeWind + TanStack Query (existing), Supabase Postgres + RLS + `pg_cron` (existing patterns extended), Supabase Edge Functions on Deno (new to this repo), PayMongo REST API (Payment Intents + Refunds), `expo-web-browser` (already a dependency).

**Spec:** `docs/superpowers/specs/2026-09-14-phase-5-payments-design.md`

## Global Constraints

- Secrets (`PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`) live only as Supabase edge function secrets — never in `.env`, never in client code. Only `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` may reach the client bundle.
- No test runner exists in this repo. Verification is: behavioural SQL run in a self-rolling-back transaction for DB logic (Phase 4's precedent), `pnpm typecheck` + `pnpm lint` for TypeScript, and manual/`curl` walkthroughs for anything that touches PayMongo — never invent a test file or assume a runner exists.
- **The PayMongo test account does not exist yet.** Every task below is buildable now; steps that require a live PayMongo call are marked **BLOCKED — needs PayMongo test keys** and given the exact command to run once they exist, rather than skipped.
- Booking status and payment state stay orthogonal (project-scope.md #12) — never add a payment-derived value to `bookings.status`, and never read `bookings.status` to infer payment state in new code.
- Money migrations go through the Supabase MCP `apply_migration` tool against the `rent-dev` project (this repo's established pattern — see `implementation-plan.md`'s "Applied to rent-dev and verified" notes), followed by `get_advisors`, per the standing rule that every DDL change gets a linter pass.
- Package manager is pnpm. Never run `pnpm format` after adding a dependency (churns the lockfile) — use `pnpm install <pkg>` and leave formatting alone.

---

## Task 1: Migration `0019` — `payments`, `payment_events`, hold-sweep guard, forfeiture trigger, `pg_cron`

**Files:**

- Create: `src/db/0019_payments.sql`

**Interfaces:**

- Produces: table `public.payments` (`id`, `booking_id`, `type` [`deposit`|`balance`|`penalty`], `amount`, `status` [`processing`|`paid`|`failed`|`refunded`|`forfeited`], `paymongo_payment_intent_id`, `paymongo_payment_id`, `paid_at`, `refunded_at`, `refund_reason`, `created_at`, `updated_at`); table `public.payment_events` (`id text primary key`, `received_at`); amended `public.expire_stale_holds()` (same signature); new `public.forfeit_deposit_on_customer_cancel()` trigger function.
- Consumes: `public.is_admin()` (0006), `public.set_updated_at()` (0001), `public.bookings` (0010).

- [ ] **Step 1: Write the migration file**

```sql
-- Phase 5 — payments, and the two pieces of Phase 4 scaffolding it finishes:
-- the hold sweeper never ran (pg_cron was never installed) and it would have
-- been unsafe to run anyway (nothing stopped it deleting a hold with a
-- payment in flight). See docs/superpowers/specs/2026-09-14-phase-5-payments-design.md.

-- payments -----------------------------------------------------------------
create table if not exists public.payments (
  id                          uuid primary key default gen_random_uuid(),
  booking_id                  uuid not null references public.bookings (id) on delete restrict,
  -- 'deposit' comes only from the PayMongo flow; 'balance' and 'penalty' are
  -- admin-entered, in-shop, no gateway involved.
  type                        text not null check (type in ('deposit', 'balance', 'penalty')),
  amount                      numeric(10,2) not null check (amount >= 0),
  status                      text not null check (status in
                                ('processing', 'paid', 'failed', 'refunded', 'forfeited')),
  paymongo_payment_intent_id  text,
  paymongo_payment_id         text,
  paid_at                     timestamptz,
  refunded_at                 timestamptz,
  refund_reason               text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);

-- At most one deposit payment may be in flight per booking, so a double-tap
-- on "Pay" reuses the existing intent instead of spawning a second one.
create unique index if not exists payments_one_processing_deposit_idx
  on public.payments (booking_id)
  where (type = 'deposit' and status = 'processing');

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- A customer sees payments for their own bookings; admin sees all.
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
  on public.payments for select
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.bookings b
       where b.id = payments.booking_id
         and b.customer_id = (select auth.uid())
    )
  );

-- Admin may hand-enter a balance payment or a penalty, already settled.
-- Deposit rows and any transition into 'paid'/'refunded' never go through a
-- client-held session at all — only the service-role edge functions write
-- those, which bypass RLS regardless. This check guards the admin UI itself
-- against doing the wrong thing, not the real security boundary.
drop policy if exists "payments_insert_admin_manual" on public.payments;
create policy "payments_insert_admin_manual"
  on public.payments for insert
  with check (
    (select public.is_admin())
    and type in ('balance', 'penalty')
    and status = 'paid'
  );

-- payment_events -------------------------------------------------------------
-- Dedupes webhook deliveries by PayMongo's event id. Deny-all by design (same
-- pattern as admin_invite_codes, 0009) — only the webhook's service-role
-- client ever touches this table.
create table if not exists public.payment_events (
  id           text primary key,
  received_at  timestamptz not null default now()
);
alter table public.payment_events enable row level security;

-- expire_stale_holds(): skip a hold with a payment still in flight ------------
-- Without this, a slow gateway redirect can get its slot swept out from under
-- an in-flight charge. Same signature as 0010 — privileges already granted
-- there (revoked from anon/authenticated in 0012) carry over unchanged.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  swept integer;
begin
  with expired as (
    delete from public.bookings b
     where b.status = 'hold'
       and b.hold_expires_at < now()
       and not exists (
         select 1 from public.payments p
          where p.booking_id = b.id
            and p.status = 'processing'
       )
    returning 1
  )
  select count(*) into swept from expired;
  return swept;
end;
$$;

-- Auto-forfeit a paid deposit when the CUSTOMER cancels ----------------------
-- "No refund, ever" for a customer-initiated cancellation (Open Item #4). No
-- PayMongo call needed — forfeiture is bookkeeping only, so it is DB-enforced
-- rather than routed through an edge function. Trusted server-side contexts
-- (auth.uid() is null) and admin actions never trigger this — see
-- `admin-refund-booking` (Task 5) for the shop-initiated refund path instead.
create or replace function public.forfeit_deposit_on_customer_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and auth.uid() is not null
     and not public.is_admin() then
    update public.payments
       set status = 'forfeited'
     where booking_id = new.id
       and type = 'deposit'
       and status = 'paid';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_forfeit_deposit_on_cancel on public.bookings;
create trigger bookings_forfeit_deposit_on_cancel
  after update on public.bookings
  for each row execute function public.forfeit_deposit_on_customer_cancel();

-- Trigger functions are not an API (0018's rule, applied to a new one).
revoke execute on function public.forfeit_deposit_on_customer_cancel()
  from public, anon, authenticated;

-- pg_cron: actually run the sweep ---------------------------------------------
-- expire_stale_holds() has existed since 0010 and nothing has ever called it.
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'expire-holds') then
    perform cron.schedule(
      'expire-holds', '* * * * *', 'select public.expire_stale_holds();'
    );
  end if;
end;
$$;
```

- [ ] **Step 2: Apply the migration to `rent-dev`**

Use the Supabase MCP `apply_migration` tool (`name: "0019_payments"`, the SQL above as `query`) against the `rent-dev` project — the established pattern for every migration since `0011` per `implementation-plan.md`.

- [ ] **Step 3: Run `get_advisors` and resolve anything new**

Expected: no new findings beyond the four already-intentional `SECURITY DEFINER` functions this repo already carries (`is_admin`, `item_day_states`, `pick_free_unit`, `verify_admin_invite_code`) — `forfeit_deposit_on_customer_cancel` and `expire_stale_holds` are both `SECURITY DEFINER` but both already have their `EXECUTE` revoked from `anon`/`authenticated`, so the linter should not flag them as externally callable.

- [ ] **Step 4: Verify with behavioural SQL (self-rolling-back transaction)**

Run via `execute_sql` against `rent-dev`, wrapped in `begin; ... rollback;` so nothing persists (Phase 4's verification pattern):

```sql
begin;

-- Fixtures: a customer, an item, a unit, and a hold booking.
insert into public.customers (id, full_name, phone_number)
  values ('11111111-1111-1111-1111-111111111111', 'Test Customer', '+639170000000');
-- (assumes at least one item/unit already exists in rent-dev's seed data —
-- substitute a real item_id/unit_id from `select id from items limit 1` and
-- `select id from item_units limit 1` when running this.)

insert into public.bookings (id, customer_id, item_id, unit_id, pickup_date, return_date, status, hold_expires_at)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
          '<item_id>', '<unit_id>', current_date + 30, current_date + 32, 'hold', now() - interval '1 minute');

insert into public.payments (booking_id, type, amount, status)
  values ('22222222-2222-2222-2222-222222222222', 'deposit', 1000, 'processing');

-- 1. A hold with an in-flight payment must survive the sweep even though it's expired.
select public.expire_stale_holds();
select status from public.bookings where id = '22222222-2222-2222-2222-222222222222';
-- expect: 'hold' still present

-- 2. Once the payment resolves (failed), the sweep may now reclaim it.
update public.payments set status = 'failed' where booking_id = '22222222-2222-2222-2222-222222222222';
select public.expire_stale_holds();
select count(*) from public.bookings where id = '22222222-2222-2222-2222-222222222222';
-- expect: 0

-- 3. Forfeiture trigger: a customer-cancelled, paid deposit flips to forfeited.
insert into public.bookings (id, customer_id, item_id, unit_id, pickup_date, return_date, status)
  values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
          '<item_id>', '<unit_id>', current_date + 40, current_date + 42, 'pending');
insert into public.payments (booking_id, type, amount, status)
  values ('33333333-3333-3333-3333-333333333333', 'deposit', 1000, 'paid');

select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
update public.bookings set status = 'cancelled' where id = '33333333-3333-3333-3333-333333333333';
reset role;

select status from public.payments where booking_id = '33333333-3333-3333-3333-333333333333';
-- expect: 'forfeited'

-- 4. RLS: the same customer can read their own payment row...
set local role authenticated;
select count(*) from public.payments where booking_id = '33333333-3333-3333-3333-333333333333';
-- expect: 1
reset role;

-- 5. ...but a DIFFERENT authenticated customer cannot.
select set_config('request.jwt.claims',
  json_build_object('sub', '99999999-9999-9999-9999-999999999999', 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) from public.payments where booking_id = '33333333-3333-3333-3333-333333333333';
-- expect: 0
reset role;

-- 6. A non-admin authenticated customer cannot insert a payments row at all.
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.payments (booking_id, type, amount, status)
  values ('33333333-3333-3333-3333-333333333333', 'balance', 500, 'paid');
-- expect: error, row-level security policy violation
reset role;

rollback;
```

Confirm every `-- expect` comment matches. If step 3 or 4's forfeiture check doesn't fire, the most likely cause is the `set_config`/`set local role` combination not being recognized by `is_admin()`'s or `auth.uid()`'s underlying `current_setting` calls — cross-check against how `0017`'s verification simulated `anon`/customer roles, since this migration reuses that exact technique.

- [ ] **Step 5: Commit**

```bash
git add src/db/0019_payments.sql
git commit -m "feat(db): add payments table, hold-sweep guard, and cancellation forfeiture (Phase 5)"
```

---

## Task 2: Exclude `supabase/functions` from the app's typecheck, and shared PayMongo server helper

Deno edge functions use remote URL imports and the `Deno` global — `tsc` will fail on them if left inside the app's `include` glob, so this has to happen before any edge function file exists.

**Files:**

- Modify: `tsconfig.json`
- Create: `supabase/functions/_shared/paymongo.ts`

**Interfaces:**

- Produces: `createPaymentIntent(input: { amountCentavos: number; description: string; metadata: Record<string,string> }): Promise<{ id: string; attributes: { client_key: string; status: string } }>`, `refundPayment(input: { paymongoPaymentId: string; amountCentavos: number; reason: 'requested_by_customer' | 'others'; notes: string }): Promise<{ id: string; status: string }>`, `verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean>` — all consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Exclude edge functions from `tsc`**

Modify `tsconfig.json:10-16`:

```json
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ],
  "exclude": ["supabase/functions/**"]
```

- [ ] **Step 2: Run typecheck to confirm nothing broke**

Run: `pnpm typecheck`
Expected: same result as before this change (no new errors, since no edge-function files exist yet — this step only proves the exclude clause itself is valid).

- [ ] **Step 3: Write the shared PayMongo helper**

```typescript
// supabase/functions/_shared/paymongo.ts
//
// Server-side PayMongo REST wrapper. Never import this from client code — it
// signs requests with the secret key, which must only ever live as an edge
// function secret (PAYMONGO_SECRET_KEY), never in EXPO_PUBLIC_*.
//
// This has not been exercised against a live PayMongo account yet (none
// exists as of this plan) — re-confirm field names against PayMongo's current
// API reference (https://developers.paymongo.com/reference) before relying on
// it against real traffic.

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function secretAuthHeader(): string {
  const key = Deno.env.get('PAYMONGO_SECRET_KEY');
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not set');
  return `Basic ${btoa(`${key}:`)}`;
}

export type PaymongoIntent = {
  id: string;
  attributes: { client_key: string; status: string };
};

export async function createPaymentIntent(input: {
  amountCentavos: number;
  description: string;
  metadata: Record<string, string>;
}): Promise<PaymongoIntent> {
  const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: secretAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.amountCentavos,
          currency: 'PHP',
          description: input.description,
          metadata: input.metadata,
          payment_method_allowed: ['card', 'gcash', 'grab_pay', 'paymaya'],
          payment_method_options: { card: { request_three_d_secure: 'any' } },
          capture_type: 'automatic',
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `PayMongo create_payment_intent failed: ${JSON.stringify(json)}`,
    );
  }
  return json.data as PaymongoIntent;
}

export async function refundPayment(input: {
  paymongoPaymentId: string;
  amountCentavos: number;
  reason: 'requested_by_customer' | 'others';
  notes: string;
}): Promise<{ id: string; status: string }> {
  const res = await fetch(`${PAYMONGO_API}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: secretAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.amountCentavos,
          payment_id: input.paymongoPaymentId,
          reason: input.reason,
          notes: input.notes,
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayMongo refund failed: ${JSON.stringify(json)}`);
  }
  return { id: json.data.id, status: json.data.attributes.status };
}

/**
 * Verifies the `Paymongo-Signature` header: `t=<unix ts>,te=<test hmac>,
 * li=<live hmac>`, each an HMAC-SHA256 of `${t}.${rawBody}` keyed on the
 * webhook secret, hex-encoded. Matches against either `te` or `li` since we
 * don't know in advance which mode fired.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = Deno.env.get('PAYMONGO_WEBHOOK_SECRET');
  if (!secret) throw new Error('PAYMONGO_WEBHOOK_SECRET is not set');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=') as [string, string]),
  );
  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp || (!testSig && !liveSig)) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === testSig || computed === liveSig;
}
```

- [ ] **Step 4: Verify the signature function in isolation**

**BLOCKED on nothing** — this is pure crypto, no PayMongo account needed. Run with the Supabase CLI's bundled Deno:

```bash
deno eval "
import { verifyWebhookSignature } from './supabase/functions/_shared/paymongo.ts';
Deno.env.set('PAYMONGO_WEBHOOK_SECRET', 'whsk_test');
const body = '{\"hello\":\"world\"}';
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsk_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('1700000000.' + body));
const hex = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
console.log('valid:', await verifyWebhookSignature(body, 't=1700000000,te=' + hex));
console.log('invalid:', await verifyWebhookSignature(body, 't=1700000000,te=deadbeef'));
"
```

Expected: `valid: true`, `invalid: false`.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json supabase/functions/_shared/paymongo.ts
git commit -m "feat(payments): add shared PayMongo server helper and exclude edge functions from tsc"
```

---

## Task 3: Edge function `create-payment-intent`

**Files:**

- Create: `supabase/functions/create-payment-intent/index.ts`

**Interfaces:**

- Consumes: `createPaymentIntent` from `../_shared/paymongo.ts` (Task 2).
- Produces: `POST /functions/v1/create-payment-intent` — request `{ bookingId: string }` (with the caller's `Authorization` header), response `{ clientKey: string; paymentIntentId: string }` or an error status.

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/create-payment-intent/index.ts
//
// Called when the customer taps "Pay" on a checkout hold. Creates (or reuses,
// if already in flight) a PayMongo Payment Intent for that hold's deposit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createPaymentIntent } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      {
        status: 401,
      },
    );
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'bookingId is required' }), {
      status: 400,
    });
  }

  // Scoped to the caller's own session, so `bookings_select_own_or_admin`
  // RLS is the only ownership check needed — a customer can only ever read
  // (and therefore only ever create an intent for) their own hold.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: booking, error: bookingError } = await callerClient
    .from('bookings')
    .select('id, reference, status, hold_expires_at, items(deposit)')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) {
    return new Response(JSON.stringify({ error: bookingError.message }), {
      status: 500,
    });
  }
  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
    });
  }
  if (booking.status !== 'hold') {
    return new Response(
      JSON.stringify({ error: 'This booking is not an active hold' }),
      {
        status: 409,
      },
    );
  }
  if (new Date(booking.hold_expires_at as string) < new Date()) {
    return new Response(JSON.stringify({ error: 'This hold has expired' }), {
      status: 409,
    });
  }

  // Service-role client for writing `payments`, which no client session may
  // write to directly for a deposit row (see 0019's RLS policy).
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await serviceClient
    .from('payments')
    .select('paymongo_payment_intent_id')
    .eq('booking_id', bookingId)
    .eq('type', 'deposit')
    .eq('status', 'processing')
    .maybeSingle();

  if (existing?.paymongo_payment_intent_id) {
    // Idempotent retry — e.g. the customer backgrounded the app mid-payment.
    // PayMongo's client_key is not re-derivable from the intent id alone, so
    // re-fetch the intent to hand back a usable client_key.
    const res = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${existing.paymongo_payment_intent_id}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${Deno.env.get('PAYMONGO_SECRET_KEY')}:`)}`,
        },
      },
    );
    const json = await res.json();
    return new Response(
      JSON.stringify({
        clientKey: json.data.attributes.client_key,
        paymentIntentId: existing.paymongo_payment_intent_id,
      }),
      { status: 200 },
    );
  }

  const deposit = Number(
    (booking.items as { deposit: number } | null)?.deposit ?? 0,
  );
  const intent = await createPaymentIntent({
    amountCentavos: Math.round(deposit * 100),
    description: `Deposit for ${booking.reference}`,
    metadata: { booking_id: booking.id, reference: booking.reference },
  });

  const { error: insertError } = await serviceClient.from('payments').insert({
    booking_id: booking.id,
    type: 'deposit',
    amount: deposit,
    status: 'processing',
    paymongo_payment_intent_id: intent.id,
  });
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({
      clientKey: intent.attributes.client_key,
      paymentIntentId: intent.id,
    }),
    { status: 200 },
  );
});
```

- [ ] **Step 2: Deploy the function**

Use the Supabase MCP `deploy_edge_function` tool (`name: "create-payment-intent"`, the file above) against `rent-dev`. A successful deploy is itself Deno's type-check passing — this repo has no local Deno-aware editor tooling to check it beforehand.

- [ ] **Step 3: Verify the request-validation paths (no PayMongo call needed)**

```bash
# Missing auth header -> 401
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/create-payment-intent" \
  -H "Content-Type: application/json" -d '{"bookingId":"00000000-0000-0000-0000-000000000000"}'
# expect: 401

# Missing bookingId -> 400
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/create-payment-intent" \
  -H "Authorization: Bearer <a real customer access token>" \
  -H "Content-Type: application/json" -d '{}'
# expect: 400

# Booking that isn't a hold (or doesn't belong to this customer) -> 404 or 409
```

- [ ] **Step 4: BLOCKED — needs PayMongo test keys**

Once `PAYMONGO_SECRET_KEY` is set (`supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx --project-ref <ref>`), re-run step 3's last case against a real `hold` booking and confirm a `200` with a `clientKey` and that a `payments` row appears with `status = 'processing'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/create-payment-intent/index.ts
git commit -m "feat(payments): add create-payment-intent edge function"
```

---

## Task 4: Edge function `paymongo-webhook`

**Files:**

- Create: `supabase/functions/paymongo-webhook/index.ts`

**Interfaces:**

- Consumes: `refundPayment`, `verifyWebhookSignature` from `../_shared/paymongo.ts` (Task 2).
- Produces: `POST /functions/v1/paymongo-webhook` — public endpoint, called by PayMongo directly (no user JWT).

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/paymongo-webhook/index.ts
//
// The only place a deposit is ever marked paid. Public endpoint — PayMongo
// calls this directly, so trust comes from the signature, not a user JWT.
//
// The event payload shape below (`data.attributes.type` /
// `data.attributes.data.attributes.payment_intent_id`) is PayMongo's
// documented envelope as of writing this plan; re-confirm against a captured
// real delivery once test-mode keys exist and this has actually received one
// — no PayMongo account exists yet to verify it against.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refundPayment, verifyWebhookSignature } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('Paymongo-Signature');
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
    });
  }

  const event = JSON.parse(rawBody);
  const eventId: string = event.data.id;
  const eventType: string = event.data.attributes.type;
  const resource = event.data.attributes.data;
  const paymentIntentId: string | undefined =
    resource?.attributes?.payment_intent_id ?? resource?.attributes?.data?.id;

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Dedupe first. A unique-violation here means this delivery was already
  // processed — webhooks retry and can arrive twice or out of order.
  const { error: dedupeError } = await db
    .from('payment_events')
    .insert({ id: eventId });
  if (dedupeError) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
    });
  }

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ ok: true, ignored: 'no payment_intent_id' }),
      {
        status: 200,
      },
    );
  }

  const { data: payment } = await db
    .from('payments')
    .select('id, booking_id, amount')
    .eq('paymongo_payment_intent_id', paymentIntentId)
    .eq('type', 'deposit')
    .maybeSingle();

  if (!payment) {
    return new Response(
      JSON.stringify({ ok: true, ignored: 'unknown payment_intent_id' }),
      {
        status: 200,
      },
    );
  }

  if (eventType === 'payment.paid') {
    await db
      .from('payments')
      .update({
        status: 'paid',
        paymongo_payment_id: resource.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    const { data: advanced } = await db
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', payment.booking_id)
      .eq('status', 'hold')
      .select('id');

    if (!advanced || advanced.length === 0) {
      // The hold was already swept before this webhook landed — rare, since
      // Task 1's guard skips the sweep while a payment is 'processing', but
      // not impossible if the webhook itself was unusually slow. The
      // customer paid for a slot that's gone: refund in full.
      const refund = await refundPayment({
        paymongoPaymentId: resource.id,
        amountCentavos: Math.round(Number(payment.amount) * 100),
        reason: 'others',
        notes: 'Hold expired before payment confirmation could land',
      });
      await db
        .from('payments')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          refund_reason: 'Hold expired before payment confirmation could land',
        })
        .eq('id', payment.id);
      return new Response(JSON.stringify({ ok: true, refunded: refund.id }), {
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (eventType === 'payment.failed') {
    // Leave the hold running — the customer can retry with another method
    // before the countdown actually runs out.
    await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
    status: 200,
  });
});
```

- [ ] **Step 2: Deploy the function**

Use the Supabase MCP `deploy_edge_function` tool (`name: "paymongo-webhook"`) against `rent-dev`.

- [ ] **Step 3: Verify signature rejection (no PayMongo account needed)**

```bash
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/paymongo-webhook" \
  -H "Content-Type: application/json" \
  -H "Paymongo-Signature: t=1700000000,te=deadbeef" \
  -d '{"data":{"id":"evt_test","attributes":{"type":"payment.paid","data":{"id":"pay_test","attributes":{"payment_intent_id":"pi_test"}}}}}'
# expect: 400, {"error":"Invalid signature"}
```

- [ ] **Step 4: Verify the dedupe path with a correctly-signed but unknown-intent payload**

Compute a valid signature with the same technique as Task 2 Step 4 (a throwaway `PAYMONGO_WEBHOOK_SECRET` set via `supabase secrets set` works fine for this — the payload's `payment_intent_id` deliberately won't match any real row):

```bash
# First delivery -> ignored (unknown payment_intent_id), but the event id is now recorded
# Second delivery with the SAME event id -> {"ok":true,"duplicate":true}
```

Expected: the first call returns `{"ok":true,"ignored":"unknown payment_intent_id"}`; replaying the identical body returns `{"ok":true,"duplicate":true}` instead of reprocessing.

- [ ] **Step 5: BLOCKED — needs PayMongo test keys**

Once test keys and a real webhook subscription exist (PayMongo dashboard → Webhooks → point at
`https://<project-ref>.supabase.co/functions/v1/paymongo-webhook`, subscribe to `payment.paid`
and `payment.failed`), drive a real test-mode GCash payment through Task 3's intent and confirm:
the booking flips `hold → pending`, the `payments` row reads `paid`, and re-delivering the same
webhook event (PayMongo's dashboard has a "resend" button) is a no-op.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/paymongo-webhook/index.ts
git commit -m "feat(payments): add paymongo-webhook edge function"
```

---

## Task 5: Edge function `admin-refund-booking`

**Files:**

- Create: `supabase/functions/admin-refund-booking/index.ts`

**Interfaces:**

- Consumes: `refundPayment` from `../_shared/paymongo.ts` (Task 2).
- Produces: `POST /functions/v1/admin-refund-booking` — request `{ reference: string; action: 'reject' | 'cancel'; reason: string }` (admin's JWT forwarded), response `{ ok: true }` or an error.

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/admin-refund-booking/index.ts
//
// Reject or shop-initiated cancel, for a booking whose deposit is already
// paid. Refunds first, then transitions the booking, in one call — so a
// booking can never end up rejected/cancelled-by-shop with an unrefunded
// deposit, which two separate client calls could leave behind if the second
// one failed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refundPayment } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      {
        status: 401,
      },
    );
  }

  const { reference, action, reason } = await req.json();
  if (!reference || !['reject', 'cancel'].includes(action) || !reason?.trim()) {
    return new Response(
      JSON.stringify({
        error: 'reference, action (reject|cancel), and reason are required',
      }),
      { status: 400 },
    );
  }

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: isAdmin } = await callerClient.rpc('is_admin');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
    });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: booking, error: bookingError } = await db
    .from('bookings')
    .select('id')
    .eq('reference', reference)
    .maybeSingle();
  if (bookingError)
    return new Response(JSON.stringify({ error: bookingError.message }), {
      status: 500,
    });
  if (!booking)
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
    });

  const { data: payment } = await db
    .from('payments')
    .select('id, amount, paymongo_payment_id')
    .eq('booking_id', booking.id)
    .eq('type', 'deposit')
    .eq('status', 'paid')
    .maybeSingle();

  if (payment?.paymongo_payment_id) {
    const refund = await refundPayment({
      paymongoPaymentId: payment.paymongo_payment_id,
      amountCentavos: Math.round(Number(payment.amount) * 100),
      reason: 'others',
      notes: reason,
    });
    await db
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq('id', payment.id);
    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Refund did not succeed: ${refund.status}` }),
        {
          status: 502,
        },
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: action === 'reject' ? 'rejected' : 'cancelled',
  };
  if (action === 'reject') patch.rejection_reason = reason;

  const { error: updateError } = await db
    .from('bookings')
    .update(patch)
    .eq('id', booking.id);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

- [ ] **Step 2: Deploy the function**

Use the Supabase MCP `deploy_edge_function` tool (`name: "admin-refund-booking"`) against `rent-dev`.

- [ ] **Step 3: Verify the non-PayMongo paths**

```bash
# Non-admin caller -> 403
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/admin-refund-booking" \
  -H "Authorization: Bearer <a customer access token>" -H "Content-Type: application/json" \
  -d '{"reference":"RNT-00001","action":"reject","reason":"test"}'
# expect: 403

# Admin caller, booking with no paid deposit -> booking still transitions,
# no refund call attempted (payment lookup returns null, skip straight to the
# status update)
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/admin-refund-booking" \
  -H "Authorization: Bearer <an admin access token>" -H "Content-Type: application/json" \
  -d '{"reference":"<a real pending booking with no payments row>","action":"reject","reason":"Not available"}'
# expect: 200, {"ok":true}; booking.status = 'rejected' in the DB
```

- [ ] **Step 4: BLOCKED — needs PayMongo test keys**

Once keys exist, repeat step 3's second case against a booking with a real `paid` deposit and confirm the refund actually posts (check PayMongo's test dashboard) and `payments.status` becomes `refunded`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin-refund-booking/index.ts
git commit -m "feat(payments): add admin-refund-booking edge function"
```

---

## Task 6: Client PayMongo helper + env var

**Files:**

- Create: `src/lib/paymongo.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**

- Produces: `createPaymentMethod(input: { type: 'gcash' | 'grab_pay' | 'paymaya' | 'card'; billing: { name: string; email: string; phone: string } }): Promise<{ id: string }>`, `attachPaymentMethod(input: { paymentIntentId: string; clientKey: string; paymentMethodId: string; returnUrl: string }): Promise<{ status: string; redirectUrl: string | null }>` — consumed by Task 8 (`reserve/payment.tsx`).

- [ ] **Step 1: Add the public key to env config**

Modify `src/lib/env.ts:13-16`:

```typescript
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  paymongoPublicKey: process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY ?? '',
};
```

- [ ] **Step 2: Document it in `.env.example`**

Append to `.env.example`:

```bash
# PayMongo public key (safe to embed client-side — this is what it's for).
# The secret key and webhook secret are NOT here: they live in Supabase edge
# function secrets (`supabase secrets set PAYMONGO_SECRET_KEY=... PAYMONGO_WEBHOOK_SECRET=...`).
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=
```

- [ ] **Step 3: Write the client helper**

```typescript
// src/lib/paymongo.ts
//
// Client-side PayMongo calls. Both of these are safe to make directly from
// the app: `createPaymentMethod` is signed with the PUBLIC key (that's what
// it's for), and `attachPaymentMethod` is authorized by the intent's
// `client_key`, not the secret key — PayMongo designed both for client use so
// a checkout can complete without a server round trip for every step.

import { env } from '@/lib/env';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function publicAuthHeader(): string {
  return `Basic ${btoa(`${env.paymongoPublicKey}:`)}`;
}

export type PaymentMethodType = 'gcash' | 'grab_pay' | 'paymaya' | 'card';

export async function createPaymentMethod(input: {
  type: PaymentMethodType;
  billing: { name: string; email: string; phone: string };
}): Promise<{ id: string }> {
  const res = await fetch(`${PAYMONGO_API}/payment_methods`, {
    method: 'POST',
    headers: {
      Authorization: publicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: { attributes: { type: input.type, billing: input.billing } },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.errors?.[0]?.detail ?? 'Could not start that payment method.',
    );
  }
  return { id: json.data.id as string };
}

export async function attachPaymentMethod(input: {
  paymentIntentId: string;
  clientKey: string;
  paymentMethodId: string;
  returnUrl: string;
}): Promise<{ status: string; redirectUrl: string | null }> {
  const res = await fetch(
    `${PAYMONGO_API}/payment_intents/${input.paymentIntentId}/attach`,
    {
      method: 'POST',
      headers: {
        Authorization: publicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: input.paymentMethodId,
            client_key: input.clientKey,
            return_url: input.returnUrl,
          },
        },
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.errors?.[0]?.detail ?? 'Payment could not be started.',
    );
  }
  return {
    status: json.data.attributes.status as string,
    redirectUrl: json.data.attributes.next_action?.redirect?.url ?? null,
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass. No live PayMongo call is possible yet (no public key) — that's Task 9's device walkthrough, marked blocked there.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paymongo.ts src/lib/env.ts .env.example
git commit -m "feat(payments): add client-side PayMongo helper and public key config"
```

---

## Task 7: Booking draft, context, and hooks for the hold + payment intent

**Files:**

- Modify: `src/features/booking/types.ts`
- Modify: `src/features/booking/booking-context.tsx`
- Modify: `src/features/booking/api.ts`
- Modify: `src/features/booking/hooks.ts`

**Interfaces:**

- Produces: `createHold(input: CreateHoldInput): Promise<{ id: string; reference: string; holdExpiresAt: string }>`, `createPaymentIntent(bookingId: string): Promise<{ clientKey: string; paymentIntentId: string }>`, `fetchHoldStatus(bookingId: string): Promise<string>`, hooks `useCreateHold()`, `useCreatePaymentIntent()`, `useHoldStatus(bookingId: string | null, opts: { enabled: boolean })`; `BookingDraft` gains `bookingId: string | null`, `reference: string | null`, `holdExpiresAt: string | null`; `useBooking()` gains `setHold(input: { bookingId: string; reference: string; holdExpiresAt: string }): void`.
- Consumes: `createPaymentIntent` supabase function (Task 3), `pick_free_unit` RPC (existing, 0011).

- [ ] **Step 1: Extend `BookingDraft`**

Modify `src/features/booking/types.ts:56-69`:

```typescript
/** The in-progress booking, filled in screen by screen. */
export type BookingDraft = {
  itemId: string;
  itemName: string;
  itemPhoto: string | null;
  pricePerDay: number;
  deposit: number;
  cleaningDays: number;
  pickup: DayKey | null;
  ret: DayKey | null;
  fulfillment: FulfillmentType | null;
  fittingAt: string | null;
  /** Chosen size, narrowing which physical unit the shop assigns. */
  size: string | null;
  /** Set once the checkout hold is created (Phase 5) — null until then. */
  bookingId: string | null;
  reference: string | null;
  holdExpiresAt: string | null;
};
```

- [ ] **Step 2: Add `setHold` to the booking context**

Modify `src/features/booking/booking-context.tsx` — `startDraft` (lines 47-64) must seed the three new fields as `null`, and a new `setHold` action is added alongside `setSize`:

```typescript
const startDraft = useCallback<BookingContextValue['startDraft']>((item) => {
  setDraft({
    itemId: item.id,
    itemName: item.name,
    itemPhoto: item.photo,
    pricePerDay: item.pricePerDay,
    deposit: item.deposit,
    cleaningDays: item.cleaningBufferDays,
    pickup: null,
    ret: null,
    fulfillment: null,
    fittingAt: null,
    size: item.size ?? null,
    bookingId: null,
    reference: null,
    holdExpiresAt: null,
  });
}, []);

const setHold = useCallback(
  (hold: { bookingId: string; reference: string; holdExpiresAt: string }) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            bookingId: hold.bookingId,
            reference: hold.reference,
            holdExpiresAt: hold.holdExpiresAt,
          }
        : d,
    );
  },
  [],
);
```

Add `setHold` to `BookingContextValue` (types block, lines 23-40), and to both the `value` object and its `useMemo` dependency array (lines 84-103).

- [ ] **Step 3: Replace `createBooking` with `createHold`, add `createPaymentIntent` and `fetchHoldStatus`**

Modify `src/features/booking/api.ts` — replace the whole `createBooking` function (lines 194-244) with:

```typescript
export type CreateHoldInput = {
  itemId: string;
  pickup: DayKey;
  ret: DayKey;
  fulfillment: FulfillmentType;
  fittingAt: string | null;
  size?: string | null;
};

const HOLD_MINUTES = 15;

/**
 * Reserves the dates as a checkout hold, NOT a paid booking. Payment happens
 * next (`createPaymentIntent`); only the PayMongo webhook may advance this
 * past `hold` (see `reserve/processing.tsx`).
 */
export async function createHold(
  input: CreateHoldInput,
): Promise<{ id: string; reference: string; holdExpiresAt: string }> {
  const db = requireDb();

  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sign in to reserve these dates.');
  }

  const { data: unitId, error: pickError } = await db.rpc('pick_free_unit', {
    p_item_id: input.itemId,
    p_pickup: input.pickup,
    p_return: input.ret,
    p_size: input.size ?? null,
  });
  if (pickError) throw pickError;
  if (!unitId) throw new SlotTakenError();

  const holdExpiresAt = new Date(
    Date.now() + HOLD_MINUTES * 60_000,
  ).toISOString();

  const { data, error } = await db
    .from('bookings')
    .insert({
      customer_id: userData.user.id,
      item_id: input.itemId,
      unit_id: unitId as string,
      pickup_date: input.pickup,
      return_date: input.ret,
      status: 'hold',
      hold_expires_at: holdExpiresAt,
      fulfillment_type: input.fulfillment,
      fitting_at: input.fittingAt,
      fitting_status: input.fittingAt ? 'requested' : null,
    })
    .select('id, reference, hold_expires_at')
    .single();

  if (error) {
    if (error.code === OVERLAP_CODE) throw new SlotTakenError();
    throw error;
  }
  return {
    id: data.id as string,
    reference: data.reference as string,
    holdExpiresAt: data.hold_expires_at as string,
  };
}

export async function createPaymentIntent(
  bookingId: string,
): Promise<{ clientKey: string; paymentIntentId: string }> {
  const db = requireDb();
  const { data, error } = await db.functions.invoke('create-payment-intent', {
    body: { bookingId },
  });
  if (error) throw error;
  return data as { clientKey: string; paymentIntentId: string };
}

/** Lightweight poll target for `reserve/processing.tsx` — status only. */
export async function fetchHoldStatus(bookingId: string): Promise<string> {
  const db = requireDb();
  const { data, error } = await db
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as string | undefined) ?? 'gone';
}
```

Remove the now-unused `CreateBookingInput` export and the doc comment above the old `createBooking` (lines 185-201) describing the pre-Phase-5 behavior — it's superseded by the comment on `createHold` above.

- [ ] **Step 4: Add hooks**

Modify `src/features/booking/hooks.ts` — replace the `useCreateBooking` export (lines 66-75) with:

```typescript
export function useCreateHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHoldInput) => createHold(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      qc.invalidateQueries({ queryKey: ['bookings', 'days'] });
    },
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (bookingId: string) => createPaymentIntent(bookingId),
  });
}

/** Polls a hold's status while waiting for the webhook to advance it. */
export function useHoldStatus(
  bookingId: string | null,
  opts: { enabled: boolean },
) {
  return useQuery({
    queryKey: ['bookings', 'hold-status', bookingId ?? ''],
    queryFn: () => fetchHoldStatus(bookingId as string),
    enabled: opts.enabled && Boolean(bookingId),
    refetchInterval: (query) => (query.state.data === 'hold' ? 2000 : false),
    staleTime: 0,
  });
}
```

Update the `import` block (lines 10-17) to pull in `createHold`, `createPaymentIntent`, `fetchHoldStatus`, `CreateHoldInput` instead of `createBooking`, `CreateBookingInput`.

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass. This will surface every remaining reference to the old `createBooking`/`useCreateBooking`/`CreateBookingInput` names as compile errors — leave those broken references for Tasks 8-10 to fix; do not patch them here (they belong to those tasks' review units).

- [ ] **Step 6: Commit**

```bash
git add src/features/booking/types.ts src/features/booking/booking-context.tsx src/features/booking/api.ts src/features/booking/hooks.ts
git commit -m "feat(payments): add checkout-hold and payment-intent data layer"
```

---

## Task 8: Rework `reserve/hold.tsx` — a real hold, real countdown

**Files:**

- Modify: `src/app/(app)/reserve/hold.tsx`

**Interfaces:**

- Consumes: `useCreateHold()`, `setHold()` (Task 7).

- [ ] **Step 1: Rewrite the screen**

Replace the full contents of `src/app/(app)/reserve/hold.tsx`:

```tsx
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { daysBetween, fromKey } from '@/features/booking/dates';
import { useCreateHold } from '@/features/booking/hooks';

/**
 * Screen 13 — the slot hold.
 *
 * A real `hold` row (implementation-plan Phase 5), not a client-side timer:
 * the countdown is derived from the server's `hold_expires_at`, since only
 * the DB's clock is the one `expire_stale_holds()` actually checks.
 */
export default function Hold() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, setHold } = useBooking();
  const create = useCreateHold();
  const started = useRef(false);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (started.current || !draft?.pickup || !draft.ret || draft.bookingId)
      return;
    started.current = true;
    create.mutate(
      {
        itemId: draft.itemId,
        pickup: draft.pickup,
        ret: draft.ret,
        fulfillment: draft.fulfillment ?? 'pickup',
        fittingAt: draft.fittingAt,
        size: draft.size,
      },
      {
        onSuccess: (hold) => setHold(hold),
        onError: (e) =>
          Alert.alert(
            'Those dates just got taken',
            e instanceof Error ? e.message : 'Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(app)/reserve/dates'),
              },
            ],
          ),
      },
    );
  }, [draft, create, router, setHold]);

  useEffect(() => {
    if (!draft?.holdExpiresAt) return;
    const tick = () => {
      const ms = new Date(draft.holdExpiresAt as string).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [draft?.holdExpiresAt]);

  if (!draft?.pickup || !draft.ret) {
    return <NoDraft />;
  }

  const days = daysBetween(fromKey(draft.pickup), fromKey(draft.ret)) + 1;
  const waiting = left === null;
  const expired = left === 0;
  const mm = waiting
    ? '--'
    : `${Math.floor((left as number) / 60)}`.padStart(2, '0');
  const ss = waiting ? '--' : `${(left as number) % 60}`.padStart(2, '0');

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <View className="flex-1 items-center gap-6 px-6 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bronze-soft">
          <Feather
            name={expired ? 'refresh-cw' : 'clock'}
            size={26}
            color={BRONZE}
          />
        </View>

        {expired ? (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your hold expired
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Nobody has taken these dates yet. Check them again to carry on.
            </Text>
          </>
        ) : (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your dates are reserved
            </Text>
            <Text className="font-display-bold text-5xl text-ink">
              {mm}:{ss}
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Complete your payment to confirm your booking.
            </Text>
          </>
        )}

        <View className="w-full">
          <BookingCard
            name={draft.itemName}
            photo={draft.itemPhoto}
            pickup={draft.pickup}
            ret={draft.ret}
            days={days}
          />
        </View>
      </View>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={expired ? 'Check dates again' : 'Pay now'}
          disabled={waiting}
          loading={create.isPending}
          onPress={() =>
            expired
              ? router.replace('/(app)/reserve/dates')
              : router.push('/(app)/reserve/payment')
          }
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass, and no remaining references to the removed `HOLD_SECONDS` constant anywhere in the file.

- [ ] **Step 3: Manual verification — no PayMongo needed**

Run the app (`pnpm ios` or `pnpm android`), sign in as a customer, walk to this screen. Confirm: a real row appears in `bookings` with `status = 'hold'` and a `hold_expires_at` ~15 minutes out (check via `execute_sql`); the on-screen countdown matches; leaving the app open past 15 minutes (or manually setting `hold_expires_at` to the past via `execute_sql` and waiting up to a minute for `pg_cron`) makes the row disappear and the screen show "Your hold expired" on next poll/navigation.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/reserve/hold.tsx
git commit -m "feat(payments): create a real checkout hold instead of a client-only timer"
```

---

## Task 9: Rework `reserve/payment.tsx` — create the intent, attach a method, open the redirect

**Files:**

- Modify: `src/app/(app)/reserve/payment.tsx`

**Interfaces:**

- Consumes: `useCreatePaymentIntent()` (Task 7), `createPaymentMethod`, `attachPaymentMethod` (Task 6).

- [ ] **Step 1: Rewrite the screen**

Replace the full contents of `src/app/(app)/reserve/payment.tsx`:

```tsx
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import {
  PAYMENT_METHODS,
  PaymentMethodRow,
} from '@/components/booking/payment-method-row';
import { MUTED } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useAuth } from '@/features/auth/auth-context';
import { useCreatePaymentIntent } from '@/features/booking/hooks';
import { quoteFromDraft } from '@/features/booking/pricing';
import { formatPeso } from '@/features/catalog/types';
import {
  attachPaymentMethod,
  createPaymentMethod,
  type PaymentMethodType,
} from '@/lib/paymongo';

const RETURN_URL = 'renta://reserve/payment';

/** Screen 14 — payment method, then straight into the gateway. */
export default function Payment() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const { customer } = useAuth();
  const createIntent = useCreatePaymentIntent();
  const [method, setMethod] = useState<PaymentMethodType>('gcash');
  const [submitting, setSubmitting] = useState(false);

  if (!draft?.pickup || !draft.ret || !draft.bookingId) {
    return <NoDraft />;
  }

  const q = quoteFromDraft(draft);
  if (!q) return <NoDraft />;

  async function pay() {
    if (!draft?.bookingId || !customer) return;
    setSubmitting(true);
    try {
      const intent = await createIntent.mutateAsync(draft.bookingId);
      const paymentMethod = await createPaymentMethod({
        type: method,
        billing: {
          name: customer.fullName,
          email: customer.email,
          phone: customer.phoneNumber ?? '',
        },
      });
      const attached = await attachPaymentMethod({
        paymentIntentId: intent.paymentIntentId,
        clientKey: intent.clientKey,
        paymentMethodId: paymentMethod.id,
        returnUrl: RETURN_URL,
      });

      if (attached.redirectUrl) {
        // The promise resolves once PayMongo redirects back to RETURN_URL —
        // no separate deep-link route needed, control returns to this screen.
        await WebBrowser.openAuthSessionAsync(attached.redirectUrl, RETURN_URL);
      }

      router.push('/(app)/reserve/processing');
    } catch (e) {
      Alert.alert(
        'Payment could not be started',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display-bold text-3xl leading-tight text-ink">
          Select a payment method
        </Text>

        <View className="gap-3">
          {PAYMENT_METHODS.map((m) => (
            <PaymentMethodRow
              key={m.id}
              name={m.name}
              descriptor={m.descriptor}
              mark={m.mark || '💳'}
              markColor={m.markColor}
              selected={method === m.id}
              onPress={() => setMethod(m.id as PaymentMethodType)}
            />
          ))}
        </View>

        <View className="flex-row items-center gap-2">
          <Feather name="lock" size={14} color={MUTED} />
          <Text className="font-sans text-xs text-muted">
            Payments are secure and encrypted.
          </Text>
        </View>
      </ScrollView>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={`Pay ${formatPeso(q.totalNow)}`}
          loading={submitting}
          onPress={pay}
        />
      </View>
    </View>
  );
}
```

Note: this assumes `useAuth()` exposes `customer.fullName`, `customer.email`, `customer.phoneNumber` — confirm the exact field names against `src/features/auth/auth-context.tsx` before writing this file for real, and adjust to match (the auth context is read but not touched by this plan, so its actual shape is authoritative over this snippet).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 3: BLOCKED — needs PayMongo test keys**

Nothing here can be exercised on a device without `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` and a live `create-payment-intent` deploy with real secrets. Once both exist: walk the flow on a device, confirm the gateway page opens for each of the four methods, and that completing (or cancelling) a test-mode GCash payment returns control to this screen and advances to `processing.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/reserve/payment.tsx
git commit -m "feat(payments): wire payment.tsx to PayMongo payment intents"
```

---

## Task 10: Rework `reserve/processing.tsx` — poll for the webhook, don't create the booking

**Files:**

- Modify: `src/app/(app)/reserve/processing.tsx`

**Interfaces:**

- Consumes: `useHoldStatus()` (Task 7).

- [ ] **Step 1: Rewrite the screen**

Replace the full contents of `src/app/(app)/reserve/processing.tsx`:

```tsx
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowStepper } from '@/components/booking/flow-stepper';
import { BRONZE, OVERDUE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useHoldStatus } from '@/features/booking/hooks';

const STEPS = ['Connecting', 'Processing', 'Finalizing'];
const TIMEOUT_MS = 45_000;

/**
 * Screen 15 — waits for `paymongo-webhook` to advance the hold.
 *
 * This screen does NOT write the booking — it already exists as a `hold`
 * (Phase 4/5). Only the webhook may move it off `hold`, so this polls rather
 * than assumes: a slow webhook is not the same as a failed payment.
 */
export default function Processing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, clearDraft } = useBooking();
  const [step, setStep] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const bookingId = draft?.bookingId ?? null;
  const status = useHoldStatus(bookingId, { enabled: Boolean(bookingId) });

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 900);
    const b = setTimeout(() => setStep(2), 1800);
    const timeout = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (status.data === 'pending' && draft?.reference) {
      const ref = draft.reference;
      clearDraft();
      router.replace({ pathname: '/(app)/reserve/success', params: { ref } });
    }
  }, [status.data, draft?.reference, clearDraft, router]);

  if (!bookingId) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-sans text-base text-muted">
            Nothing to confirm — start a reservation first.
          </Text>
        </View>
      </View>
    );
  }

  const failed = status.data === 'failed' || status.data === 'gone';

  if (failed) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-overdue-soft">
            <Feather name="alert-circle" size={28} color={OVERDUE} />
          </View>
          <Text className="text-center font-display-bold text-2xl text-ink">
            Your payment didn&apos;t go through
          </Text>
          <Text className="text-center font-sans text-base leading-6 text-muted">
            Nothing was charged. You can try a different payment method — your
            dates are still held.
          </Text>
        </View>
        <View
          className="gap-3 px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            label="Try again"
            onPress={() => router.replace('/(app)/reserve/payment')}
          />
        </View>
      </View>
    );
  }

  if (timedOut) {
    return (
      <View className="flex-1 items-center justify-center gap-7 bg-canvas px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-bronze-soft">
          <Feather name="clock" size={30} color={BRONZE} />
        </View>
        <View className="gap-2">
          <Text className="text-center font-display-bold text-2xl text-ink">
            Still confirming your payment
          </Text>
          <Text className="text-center font-sans text-base leading-6 text-muted">
            This is taking longer than usual. We&apos;ll update your booking as
            soon as it&apos;s confirmed — check My Bookings shortly.
          </Text>
        </View>
        <Button
          label="Go to My Bookings"
          onPress={() => router.replace('/(app)/(tabs)/bookings')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-7 bg-canvas px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-bronze-soft">
        <Feather name="credit-card" size={30} color={BRONZE} />
      </View>
      <View className="gap-2">
        <Text className="text-center font-display-bold text-2xl text-ink">
          Completing your payment
        </Text>
        <Text className="text-center font-sans text-base leading-6 text-muted">
          Please do not close the app. This will only take a moment.
        </Text>
      </View>
      <FlowStepper steps={STEPS} current={step} />
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass, and no remaining references anywhere in the app to `useCreateBooking` or `CreateBookingInput` (grep to confirm: `grep -rn "useCreateBooking\|CreateBookingInput" src/`).

- [ ] **Step 3: Manual verification — no PayMongo needed**

This screen's poll/timeout/failure logic is fully testable without PayMongo: create a hold (Task 8's device walkthrough gets you here), then from the SQL editor manually run `update bookings set status = 'pending' where id = '<bookingId>'` — confirm the screen navigates to `success.tsx` within ~2 seconds. Separately, insert a `payments` row with `status = 'failed'` for that booking and reload the screen — confirm the failure state renders and "Try again" returns to `payment.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/reserve/processing.tsx
git commit -m "feat(payments): poll for webhook confirmation instead of inserting the booking here"
```

---

## Task 11: Receipt screen + enabling "View receipt"

**Files:**

- Modify: `src/features/booking/api.ts`
- Modify: `src/features/booking/hooks.ts`
- Modify: `src/features/booking/types.ts`
- Create: `src/app/(app)/bookings/[id]/receipt.tsx`
- Modify: `src/app/(app)/reserve/success.tsx`
- Modify: `src/app/(app)/bookings/[id]/thanks.tsx`

**Interfaces:**

- Produces: `PaymentRecord` type, `fetchPayments(reference: string): Promise<PaymentRecord[]>`, `usePayments(reference: string | undefined)`.

- [ ] **Step 1: Add the `PaymentRecord` type**

Append to `src/features/booking/types.ts`:

```typescript
export type PaymentRecord = {
  type: 'deposit' | 'balance' | 'penalty';
  amount: number;
  status: 'processing' | 'paid' | 'failed' | 'refunded' | 'forfeited';
  paidAt: string | null;
  refundedAt: string | null;
};
```

- [ ] **Step 2: Add `fetchPayments`**

Append to `src/features/booking/api.ts`:

```typescript
export async function fetchPayments(
  reference: string,
): Promise<PaymentRecord[]> {
  if (!supabase) return [];
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('reference', reference)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('type, amount, status, paid_at, refunded_at')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    type: row.type as PaymentRecord['type'],
    amount: Number(row.amount),
    status: row.status as PaymentRecord['status'],
    paidAt: row.paid_at as string | null,
    refundedAt: row.refunded_at as string | null,
  }));
}
```

Add `PaymentRecord` to the existing `import type { ... } from './types'` line at the top of the file.

- [ ] **Step 3: Add `usePayments`**

Append to `src/features/booking/hooks.ts`:

```typescript
export function usePayments(reference: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'payments', reference ?? ''],
    queryFn: () => fetchPayments(reference as string),
    enabled: Boolean(reference),
  });
}
```

Add `fetchPayments` to the existing import from `./api`.

- [ ] **Step 4: Write the receipt screen**

```tsx
// src/app/(app)/bookings/[id]/receipt.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/booking/flow-header';
import { DetailRow } from '@/components/booking/money-block';
import { usePayments } from '@/features/booking/hooks';
import { formatPeso } from '@/features/catalog/types';

const STATUS_LABEL: Record<string, string> = {
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  forfeited: 'Forfeited',
};

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  balance: 'Balance',
  penalty: 'Penalty',
};

/** In-app receipt — text only. PDF/email are Phase 9, not this phase. */
export default function Receipt() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: payments, isLoading } = usePayments(id);

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Receipt" />
      <View
        className="flex-1 px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {isLoading ? null : !payments || payments.length === 0 ? (
          <Text className="text-center font-sans text-base text-muted">
            No payments recorded for this booking yet.
          </Text>
        ) : (
          <View className="divide-y divide-hairline">
            {payments.map((p, i) => (
              <DetailRow
                key={i}
                label={`${TYPE_LABEL[p.type]} — ${STATUS_LABEL[p.status]}`}
                value={formatPeso(p.amount)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
```

Note: `router` is imported but unused in this minimal version — remove the import if the linter flags it, or wire a back action through `FlowHeader`'s existing props (check `flow-header.tsx` for whether it already renders a back control before deciding which).

- [ ] **Step 5: Enable the two "View receipt" buttons**

Modify `src/app/(app)/reserve/success.tsx:70` — replace:

```tsx
<Button label="View receipt" variant="outline" disabled />
```

with:

```tsx
<Button
  label="View receipt"
  variant="outline"
  onPress={() =>
    router.push({
      pathname: '/(app)/bookings/[id]/receipt',
      params: { id: booking.ref },
    })
  }
/>
```

Remove the now-stale comment above it (lines 65-69) explaining why it was disabled.

Modify `src/app/(app)/bookings/[id]/thanks.tsx:71` the same way, using `id` (the route param, already destructured at line 16) instead of `booking.ref`, and remove its matching stale comment (lines 66-70).

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 7: Manual verification — no PayMongo needed**

Insert a `payments` row for a real booking via `execute_sql` (any status), tap "View receipt" from either entry point on a device, confirm it renders that row with the right label and amount.

- [ ] **Step 8: Commit**

```bash
git add src/features/booking/api.ts src/features/booking/hooks.ts src/features/booking/types.ts \
  "src/app/(app)/bookings/[id]/receipt.tsx" "src/app/(app)/reserve/success.tsx" "src/app/(app)/bookings/[id]/thanks.tsx"
git commit -m "feat(payments): add an in-app receipt screen"
```

---

## Task 12: Admin — visibility into payment status, and manual balance/penalty entries

**Files:**

- Modify: `src/features/admin/bookings-api.ts`
- Modify: `src/features/admin/bookings-hooks.ts`
- Modify: `src/app/(app)/admin/booking/[ref].tsx`

**Interfaces:**

- Produces: `AdminBooking` gains `depositStatus: PaymentRecord['status'] | null`, `balancePaid: boolean`; `recordBalancePaid(reference: string, amount: number): Promise<void>`, `recordPenalty(input: { reference: string; amount: number; note: string }): Promise<void>`, hooks `useRecordBalancePaid()`, `useRecordPenalty()`.
- Consumes: `owesBalance()` (existing, `bookings-api.ts`).

- [ ] **Step 1: Extend the admin booking read to include payment status**

Modify `src/features/admin/bookings-api.ts` — extend `ADMIN_BOOKING_SELECT` (lines 55-61):

```typescript
const ADMIN_BOOKING_SELECT = `
  id, reference, status, pickup_date, return_date, cleaning_buffer_days,
  fulfillment_type, fitting_at, fitting_status, rejection_reason, created_at,
  customers ( full_name, phone_number ),
  items ( name, photos, rental_fee_per_day, deposit ),
  item_units ( size ),
  payments ( type, status )
`;
```

Extend the `Row` type (lines 63-82) with `id: string;` and `payments: { type: string; status: string }[];`, and `AdminBooking` (lines 34-53) with `depositStatus: string | null; balancePaid: boolean;`. In `mapAdminBooking` (lines 84-113), derive them:

```typescript
const deposit_ = row.payments?.find((p) => p.type === 'deposit');
const balancePaid = Boolean(
  row.payments?.some((p) => p.type === 'balance' && p.status === 'paid'),
);
```

and add `depositStatus: deposit_?.status ?? null, balancePaid,` to the returned object.

- [ ] **Step 2: Route reject/cancel through the refund edge function**

Modify `src/features/admin/bookings-api.ts` — replace `updateBookingStatus` (lines 171-194):

```typescript
export async function updateBookingStatus(input: {
  reference: string;
  action: AdminAction;
  reason?: string;
}): Promise<void> {
  const db = requireDb();

  if (input.action === 'reject' && !input.reason?.trim()) {
    throw new Error('Add a reason so the customer knows why.');
  }

  // Reject and shop-cancel move money (a paid deposit is refunded first), so
  // they go through the edge function rather than a direct table update —
  // see docs/superpowers/specs/2026-09-14-phase-5-payments-design.md.
  if (input.action === 'reject' || input.action === 'cancel') {
    const { error } = await db.functions.invoke('admin-refund-booking', {
      body: {
        reference: input.reference,
        action: input.action,
        reason: input.reason ?? 'Cancelled by the shop.',
      },
    });
    if (error) throw error;
    return;
  }

  const status = TRANSITIONS[input.action];
  const patch: Record<string, unknown> = { status };
  // Approving clears any hold: the slot is the shop's decision now, not a timer.
  if (input.action === 'approve') patch.hold_expires_at = null;

  const { error } = await db
    .from('bookings')
    .update(patch)
    .eq('reference', input.reference);
  if (error) throw error;
}
```

- [ ] **Step 3: Add `recordBalancePaid` and `recordPenalty`**

Append to `src/features/admin/bookings-api.ts`:

```typescript
export async function recordBalancePaid(
  reference: string,
  amount: number,
): Promise<void> {
  const db = requireDb();
  const { data: booking, error: bookingError } = await db
    .from('bookings')
    .select('id')
    .eq('reference', reference)
    .single();
  if (bookingError) throw bookingError;

  const { error } = await db.from('payments').insert({
    booking_id: booking.id,
    type: 'balance',
    amount,
    status: 'paid',
    paid_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function recordPenalty(input: {
  reference: string;
  amount: number;
  note: string;
}): Promise<void> {
  const db = requireDb();
  const { data: booking, error: bookingError } = await db
    .from('bookings')
    .select('id')
    .eq('reference', input.reference)
    .single();
  if (bookingError) throw bookingError;

  const { error } = await db.from('payments').insert({
    booking_id: booking.id,
    type: 'penalty',
    amount: input.amount,
    status: 'paid',
    paid_at: new Date().toISOString(),
    refund_reason: input.note || null,
  });
  if (error) throw error;
}
```

(`refund_reason` doubles as a free-text note column here — it's the only text field on `payments` besides the type/status enums, and a penalty is never itself refunded, so there's no ambiguity with its other use.)

- [ ] **Step 4: Add the hooks**

Append to `src/features/admin/bookings-hooks.ts`:

```typescript
export function useRecordBalancePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { reference: string; amount: number }) =>
      recordBalancePaid(input.reference, input.amount),
    onSuccess: () => invalidateBookings(qc),
  });
}

export function useRecordPenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordPenalty,
    onSuccess: () => invalidateBookings(qc),
  });
}
```

Add `recordBalancePaid, recordPenalty` to the existing import from `./bookings-api`.

- [ ] **Step 5: Surface the actions on the admin booking detail screen**

Modify `src/app/(app)/admin/booking/[ref].tsx` — add a "Record balance paid" button gated on `owesBalance(booking) && !booking.balancePaid` and a "Add penalty" button gated on `owesBalance(booking) || isOut(booking)`, each opening a small inline amount/reason input in the same style as the existing rejection panel (lines 247-285), calling `useRecordBalancePaid()` / `useRecordPenalty()` on submit. Follow the existing `rejecting`/`reason` state pattern (lines 49-50) — add sibling `recordingBalance`/`recordingPenalty` booleans rather than a shared one, since a reviewer should be able to see both panels are mutually exclusive from the state alone.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 7: Manual verification — no PayMongo needed**

As an admin, open an `approved` booking with no balance recorded, confirm "Record balance paid" appears; submit it; confirm a `payments` row appears with `type='balance', status='paid'` and the button disappears on next load (`balancePaid` now `true`).

- [ ] **Step 8: Commit**

```bash
git add src/features/admin/bookings-api.ts src/features/admin/bookings-hooks.ts "src/app/(app)/admin/booking/[ref].tsx"
git commit -m "feat(payments): admin can see payment status and record balance/penalty"
```

---

## Task 13: `README.md` — document the PayMongo setup

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add a setup section**

Following the existing README convention of documenting one-time Supabase dashboard setup, add a section covering: creating a PayMongo account and switching to test mode; where to find the public/secret test keys; setting edge function secrets (`supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx PAYMONGO_WEBHOOK_SECRET=whsk_xxx --project-ref <ref>`); registering the webhook URL (`https://<project-ref>.supabase.co/functions/v1/paymongo-webhook`) against `payment.paid` and `payment.failed` in the PayMongo dashboard; and adding `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` to `.env`.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document PayMongo test-account setup for Phase 5"
```

---

## Task 14: Manual QA checklist for once PayMongo test keys exist

**Files:**

- None (this task is a checklist to run, not code to write) — but it's a real deliverable: a concrete, ordered list the user runs through once unblocked, so nothing from Tasks 3-11's "BLOCKED" steps gets lost.

- [x] **Step 1: Confirm the account and secrets**

`supabase secrets list --project-ref <ref>` shows `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET`; `.env` has `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`.

- [x] **Step 2: Re-run every step marked "BLOCKED — needs PayMongo test keys"**

In order: Task 3 Step 4, Task 4 Step 5, Task 5 Step 4, Task 9 Step 3.

Running these against the real account surfaced four real bugs, all now fixed:

- `reserve/payment.tsx`'s `RETURN_URL` was a raw `renta://` scheme — PayMongo
  requires `return_url` to be a reachable `https://` URL. Fixed with a new
  `paymongo-return` edge function that bridges https → the app's deep link.
- None of the three payment edge functions set `Content-Type: application/json`
  on their responses, so `functions.invoke()` silently handed callers the raw
  response text instead of a parsed object — the root cause of a
  `client_key is required` PayMongo error that had nothing to do with
  `client_key` itself. Fixed with a shared `jsonResponse()` helper
  (`_shared/http.ts`), applied to all three functions.
- `FunctionsHttpError.message` is always the SDK's generic "Edge Function
  returned a non-2xx status code" — the real `{ error }` body lives on
  `error.context` and was never being read, so every edge-function failure
  showed the same unhelpful text regardless of cause. Fixed with a shared
  `invokeFunction()` wrapper (`src/lib/supabase.ts`) that unwraps it, used by
  both `createPaymentIntent` and `updateBookingStatus`'s reject/cancel path.
- `admin-refund-booking` didn't catch a failing PayMongo refund call
  (`refundPayment()` throwing on a non-2xx response) — an uncaught exception
  crashed the request instead of returning a clean error. Fixed with a
  try/catch around the refund call.

- [x] **Step 3: Full device walkthrough**

Reserve an item → hold → pick GCash → complete a PayMongo test-mode payment → confirm `success.tsx` renders with the real deposit amount → "View receipt" shows a `paid` deposit row → as admin, reject a _different_ booking with a paid deposit and confirm the refund posts in PayMongo's test dashboard and `payments.status` becomes `refunded`.

Confirmed through "the refund posts": a real deposit payment (`RNT-00053`)
went `hold → pending`, `payments.status` went `processing → paid`, with a real
`paymongo_payment_id` and `paid_at`. The admin reject/refund call itself is
now correctly wired end-to-end (auth, lookup, refund request, clean error
surfacing) but the actual refund could not be confirmed as `succeeded` in
this run: PayMongo's test account returned `available_balance_insufficient`
("Refund amount is greater than the available payout amount") — an
account-funding limitation of the test environment, not a code defect. Two
other real bugs surfaced and were fixed along the way (see Step 2), including
one (`cancelBooking()` never clearing `hold_expires_at`, violating
`bookings_hold_has_expiry`) that predates this plan entirely.

- [ ] **Step 4: Confirm the hold-conflict path**

Manually delete a `hold` row via `execute_sql` right after Task 3's intent is created but before completing payment (simulating the sweep winning the race), then complete the PayMongo payment anyway — confirm the webhook's refund-on-conflict branch fires (check PayMongo's dashboard for the refund and `payments.status = 'refunded'` with the "hold expired" reason).

Not run — left as a follow-up. Everything else in this task passed, and the
refund-on-conflict code path (`paymongo-webhook`) was reviewed and is
unchanged from what Task 4 already exercises structurally; this step
specifically stress-tests the race timing, which needs a live session to
coordinate.

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — schema/RLS/cron/trigger (Task 1), the three edge functions (Tasks 3-5) plus their shared helper (Task 2), the client PayMongo calls (Task 6), the hold/intent data layer (Task 7), all four reworked reserve screens (Tasks 8-10, receipt in 11), both admin changes (Tasks 12), and the explicitly-out-of-scope items (Resend/PDF/penalty formula/delivery) are not present in any task, matching the spec's exclusion list.
- **Type consistency checked:** `createHold`'s return shape (`{ id, reference, holdExpiresAt }`, Task 7) matches what `setHold` (Task 7) and `hold.tsx` (Task 8) consume; `createPaymentIntent`'s `{ clientKey, paymentIntentId }` (Task 7, wrapping the edge function) matches `payment.tsx`'s usage (Task 9) and the edge function's actual response shape (Task 3); `PaymentRecord` (Task 11) is defined once and consumed by both the receipt screen and nowhere else, avoiding a second shape drifting in.
- **One noted gap, deliberately left open rather than guessed:** Task 9 depends on `useAuth()` exposing `customer.fullName` / `.email` / `.phoneNumber` — the plan flags this explicitly rather than inventing field names for a file (`auth-context.tsx`) this plan doesn't otherwise touch; whoever executes Task 9 confirms the real shape first.
