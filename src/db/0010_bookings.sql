-- Phase 4 — Bookings, slot holds, and availability.
-- Apply after 0009_admin_invite_codes.sql in the Supabase SQL editor
-- (or `supabase db push`) against the dev project.
--
-- Design notes:
--   * Booking status and PAYMENT state are orthogonal (project-scope.md #12).
--     There is deliberately no 'paid' value in `status` and no amount column
--     here: money lives in `payments` (Phase 5, migration 0011). A booking can
--     be approved and unpaid; it can be completed with a deposit still held.
--   * Double-booking is prevented by an EXCLUDE constraint, NOT by a
--     read-then-write check in the client. Two customers hitting "reserve" for
--     the same unit in the same millisecond must not both succeed, and only the
--     database can guarantee that.
--   * The blocked range covers the rental days PLUS the cleaning buffer, so the
--     buffer blocks the calendar automatically rather than relying on an admin
--     to remember. `cleaning_buffer_days` is SNAPSHOT onto the booking rather
--     than read from `items`: a generated column cannot subquery, and — more
--     importantly — changing an item's buffer later must not silently move the
--     blocked range of bookings that already exist.
--   * A checkout hold is a booking row with status 'hold' and an expiry. It
--     blocks the slot like any other booking, and is swept by
--     `expire_stale_holds()` (called on read and, ideally, by cron).
--   * A fitting is `fitting_at` on the booking and is NOT part of
--     `blocked_range`. Booking a fitting must never hold the rental dates
--     (project-scope.md #11).
--   * All rental dates are `date`, not `timestamptz` — a pickup day is a
--     calendar day in Manila, not an instant. Anything computing "today" must
--     use `public.today_manila()`, never `current_date` (which follows the
--     server's timezone).
--   * Reuses `public.set_updated_at()` (0001) and `public.is_admin()` (0006).

-- btree_gist gives us the `=` operator class for uuid inside a GiST exclusion
-- constraint, so we can scope the overlap check to a single unit.
-- (Supabase installs extensions into `extensions` by convention; the plain form
-- below works in the SQL editor. If your project pins search_path, use
-- `create extension if not exists btree_gist with schema extensions;`.)
create extension if not exists btree_gist;

-- Manila is the only timezone this business operates in. A UTC "today" rolls
-- over at 8am local and would show yesterday's dates as still bookable.
create or replace function public.today_manila()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

-- bookings --------------------------------------------------------------------
create sequence if not exists public.booking_reference_seq;

create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  -- Customer-facing reference, e.g. 'RNT-00123'. Shown at pickup.
  reference             text not null unique
                          default 'RNT-' || lpad(
                            nextval('public.booking_reference_seq')::text, 5, '0'),
  customer_id           uuid not null references public.customers (id) on delete restrict,
  item_id               uuid not null references public.items (id) on delete restrict,
  -- The physical copy being rented. NOT NULL on purpose: an exclusion
  -- constraint ignores rows with a NULL operand, so a booking without a unit
  -- would reserve nothing while still looking like a reservation.
  unit_id               uuid not null references public.item_units (id) on delete restrict,

  pickup_date           date not null,
  return_date           date not null,
  -- Snapshot of items.cleaning_buffer_days at booking time (see notes above).
  cleaning_buffer_days  integer not null default 0
                          check (cleaning_buffer_days >= 0),

  -- Booking lifecycle ONLY. No payment state here — see `payments` (Phase 5).
  status                text not null default 'pending'
                          check (status in (
                            'hold',      -- checkout hold, expires
                            'pending',   -- awaiting shop approval
                            'approved',
                            'rejected',
                            'picked_up',
                            'rented',
                            'returned',
                            'completed',
                            'cancelled'
                          )),

  -- v1 ships pickup and in-shop fittings. Delivery is v1.1 and is not a value
  -- here yet, so no row can claim it.
  fulfillment_type      text not null default 'pickup'
                          check (fulfillment_type in ('pickup', 'fitting')),
  -- A fitting appointment. Deliberately excluded from `blocked_range`.
  fitting_at            timestamptz,
  fitting_status        text
                          check (fitting_status in ('requested', 'confirmed', 'cancelled')),

  -- Only meaningful while status = 'hold'.
  hold_expires_at       timestamptz,

  -- Set by an admin when rejecting; becomes customer-facing copy.
  rejection_reason      text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint bookings_dates_ordered
    check (return_date >= pickup_date),
  constraint bookings_hold_has_expiry
    check ((status = 'hold') = (hold_expires_at is not null)),
  constraint bookings_fitting_consistent
    check ((fitting_at is null) = (fitting_status is null))
);

-- The span this booking takes the unit out of circulation for: the rental days
-- inclusive, plus the cleaning buffer that follows the return. Half-open, so
-- the next customer can pick up the day after the buffer ends.
alter table public.bookings
  add column if not exists blocked_range daterange
    generated always as (
      daterange(
        pickup_date,
        (return_date + cleaning_buffer_days + 1),
        '[)'
      )
    ) stored;

-- THE constraint that makes concurrent booking safe.
-- Cancelled and rejected bookings release their dates; everything else holds
-- them, including a completed rental (two rentals of one unit can never have
-- overlapped, historically or otherwise).
alter table public.bookings
  drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
    exclude using gist (
      unit_id with =,
      blocked_range with &&
    )
    where (status not in ('cancelled', 'rejected'));

create index if not exists bookings_customer_idx
  on public.bookings (customer_id, created_at desc);
create index if not exists bookings_item_idx on public.bookings (item_id);
create index if not exists bookings_unit_idx on public.bookings (unit_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_pickup_idx on public.bookings (pickup_date);
create index if not exists bookings_return_idx on public.bookings (return_date);
create index if not exists bookings_hold_expiry_idx
  on public.bookings (hold_expires_at)
  where status = 'hold';

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- snapshot the cleaning buffer from the item -----------------------------------
-- Done in a trigger so the client cannot understate it to grab a tighter slot.
create or replace function public.set_booking_cleaning_buffer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select i.cleaning_buffer_days
    into new.cleaning_buffer_days
    from public.items i
   where i.id = new.item_id;

  new.cleaning_buffer_days := coalesce(new.cleaning_buffer_days, 0);
  return new;
end;
$$;

drop trigger if exists bookings_snapshot_buffer on public.bookings;
create trigger bookings_snapshot_buffer
  before insert on public.bookings
  for each row execute function public.set_booking_cleaning_buffer();

-- the unit must belong to the item ---------------------------------------------
create or replace function public.check_booking_unit_matches_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit_id is not null and not exists (
    select 1 from public.item_units u
     where u.id = new.unit_id and u.item_id = new.item_id
  ) then
    raise exception 'unit % does not belong to item %', new.unit_id, new.item_id;
  end if;
  return new;
end;
$$;

-- no booking in the past -------------------------------------------------------
-- Cannot be a CHECK constraint: it depends on now(), which is not immutable.
-- Admins are exempt so the shop can record a walk-in after the fact.
create or replace function public.check_booking_not_in_past()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null in a server-side context (service role, edge function,
  -- SQL editor, cron). Those are trusted; this guard is aimed at the client.
  if auth.uid() is not null
     and not public.is_admin()
     and new.pickup_date < public.today_manila() then
    raise exception 'pickup date % is in the past (Manila)', new.pickup_date;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_not_in_past on public.bookings;
create trigger bookings_not_in_past
  before insert on public.bookings
  for each row execute function public.check_booking_not_in_past();

drop trigger if exists bookings_unit_matches_item on public.bookings;
create trigger bookings_unit_matches_item
  before insert or update of unit_id, item_id on public.bookings
  for each row execute function public.check_booking_unit_matches_item();

-- expiring holds ----------------------------------------------------------------
-- A hold that was never paid must release its dates. The exclusion constraint
-- cannot express "unless expired" (a predicate has to be immutable, and now()
-- is not), so stale holds are swept instead: on read, and by cron.
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
    delete from public.bookings
     where status = 'hold'
       and hold_expires_at < now()
    returning 1
  )
  select count(*) into swept from expired;
  return swept;
end;
$$;

comment on function public.expire_stale_holds() is
  'Deletes checkout holds past their expiry. Call before availability reads, and '
  'schedule with pg_cron: select cron.schedule(''expire-holds'', ''* * * * *'', '
  '''select public.expire_stale_holds()'');';

-- availability ------------------------------------------------------------------
-- Is a specific unit free for a span, once the cleaning buffer is added?
create or replace function public.is_unit_free(
  p_unit_id uuid,
  p_pickup  date,
  p_return  date,
  p_buffer  integer default 0
)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
      from public.bookings b
     where b.unit_id = p_unit_id
       and b.status not in ('cancelled', 'rejected')
       and b.blocked_range && daterange(
             p_pickup, (p_return + coalesce(p_buffer, 0) + 1), '[)')
  );
$$;

-- Per-day state for the customer's availability calendar.
--
-- The shop tracks six inventory states; a customer only needs three. A day is
-- 'available' when at least one sellable unit of the design is free that day.
-- When every unit is blocked, the day reads 'cleaning' if any of those blocks
-- is a post-return buffer, otherwise 'unavailable'.
create or replace function public.item_day_states(
  p_item_id uuid,
  p_from    date,
  p_to      date
)
returns table (day date, state text)
language sql
stable
as $$
  with units as (
    select u.id
      from public.item_units u
     where u.item_id = p_item_id
       and u.status not in ('damaged', 'unavailable')
  ),
  days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),
  blocks as (
    select d.day,
           b.unit_id,
           (d.day > b.return_date) as is_cleaning
      from days d
      join public.bookings b
        on b.unit_id in (select id from units)
       and b.status not in ('cancelled', 'rejected')
       and d.day >= b.pickup_date
       and d.day <= (b.return_date + b.cleaning_buffer_days)
  )
  select d.day,
         case
           when (select count(*) from units) = 0
             then 'unavailable'
           when (select count(distinct bl.unit_id) from blocks bl where bl.day = d.day)
                < (select count(*) from units)
             then 'available'
           when exists (
             select 1 from blocks bl where bl.day = d.day and bl.is_cleaning
           )
             then 'cleaning'
           else 'unavailable'
         end as state
    from days d
   order by d.day;
$$;

-- row-level security --------------------------------------------------------------
alter table public.bookings enable row level security;

-- Note on `(select auth.uid())` / `(select public.is_admin())` below: wrapping
-- these in a subselect lets the planner evaluate them ONCE per query as an
-- InitPlan instead of once per candidate row. On a bookings list that is the
-- difference between one call and one call per row.

-- A customer sees only their own bookings; an admin sees all.
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin"
  on public.bookings for select
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

-- A customer may create a booking only for themselves, and only as a hold or a
-- pending request. They cannot self-approve, cannot open one already picked up,
-- and cannot write a rejection reason.
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own"
  on public.bookings for insert
  with check (
    customer_id = (select auth.uid())
    and status in ('hold', 'pending')
    and rejection_reason is null
  );

-- A customer may only cancel their own booking, and only before it goes out.
-- Every other transition is the shop's. The WITH CHECK pins the target state so
-- an UPDATE cannot be used to jump the queue.
drop policy if exists "bookings_cancel_own" on public.bookings;
create policy "bookings_cancel_own"
  on public.bookings for update
  using (
    customer_id = (select auth.uid())
    and status in ('hold', 'pending', 'approved')
  )
  with check (
    customer_id = (select auth.uid())
    and status = 'cancelled'
  );

-- A cancel must not smuggle other edits through. The policy above pins the
-- target status; this freezes everything a customer must not rewrite while
-- cancelling (dates, unit, price-bearing fields).
create or replace function public.freeze_booking_on_customer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted server-side contexts (service role, edge functions, cron) have no
  -- end-user JWT; the Phase 5 payment webhook runs as one and must be able to
  -- advance a booking.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.item_id             is distinct from old.item_id
     or new.unit_id          is distinct from old.unit_id
     or new.customer_id      is distinct from old.customer_id
     or new.pickup_date      is distinct from old.pickup_date
     or new.return_date      is distinct from old.return_date
     or new.cleaning_buffer_days is distinct from old.cleaning_buffer_days
     or new.reference        is distinct from old.reference
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'only the shop can change booking % beyond cancelling it',
      old.reference;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_freeze_on_customer_update on public.bookings;
create trigger bookings_freeze_on_customer_update
  before update on public.bookings
  for each row execute function public.freeze_booking_on_customer_update();

-- The shop can do anything to any booking.
drop policy if exists "bookings_write_admin" on public.bookings;
create policy "bookings_write_admin"
  on public.bookings for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- audit --------------------------------------------------------------------------
-- Who approved, rejected, cancelled or modified a booking (project-scope.md #31).
-- Reuses the trigger from 0007. Inserts are not logged: a customer creating
-- their own booking is already recorded by customer_id + created_at, and the log
-- is for actions taken ON a booking after it exists. `actor_id` may therefore be
-- the customer (a self-cancel) or an admin.
drop trigger if exists bookings_audit on public.bookings;
create trigger bookings_audit
  after update or delete on public.bookings
  for each row execute function public.log_admin_action();
