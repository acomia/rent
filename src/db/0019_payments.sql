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
