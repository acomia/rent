-- Phase 4 (closing a gap) — drive item_units.status from the booking
-- lifecycle instead of leaving it entirely to manual admin edits.
--
-- This is informational only: pick_free_unit() already excludes nothing but
-- 'damaged'/'unavailable' (see 0011) — 'reserved'/'rented' units are still
-- pickable for a non-overlapping date range, because the exclusion
-- constraint on bookings, not item_units.status, is what actually prevents
-- a double booking. So this column is a snapshot of "what a unit is doing
-- right now" for the admin's inventory view, not a booking-correctness
-- input. A unit with two bookings at different lifecycle stages at once
-- (rare at this shop's scale) shows whichever transitioned most recently,
-- not strictly today's state — an accepted v1 simplification, matching the
-- imprecision the fully-manual system already had.

-- markReturned's return-condition flag, captured atomically with the status
-- change instead of a separate follow-up update to item_units.
alter table public.bookings
  add column if not exists needs_attention boolean not null default false;

-- bookings -> item_units sync ---------------------------------------------
create or replace function public.sync_item_unit_status_on_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'approved' then
    update public.item_units set status = 'reserved' where id = new.unit_id;
  elsif new.status = 'picked_up' then
    update public.item_units set status = 'rented' where id = new.unit_id;
  elsif new.status = 'completed' then
    update public.item_units
       set status = case when new.needs_attention then 'damaged' else 'under_cleaning' end
     where id = new.unit_id;
  elsif new.status = 'cancelled' and old.status = 'approved' then
    -- Only reverts a reservation this same trigger made — guards against
    -- clobbering some other state a manual admin edit set in between.
    update public.item_units
       set status = 'available'
     where id = new.unit_id
       and status = 'reserved';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_item_unit_status on public.bookings;
create trigger bookings_sync_item_unit_status
  after update on public.bookings
  for each row execute function public.sync_item_unit_status_on_booking_change();

-- Trigger functions are not an API (0018's rule, applied to a new one).
revoke execute on function public.sync_item_unit_status_on_booking_change()
  from public, anon, authenticated;

-- cleaning -> available sweep ------------------------------------------------
-- A unit stays 'under_cleaning' until its buffer elapses. Snapshotted
-- cleaning_buffer_days lives on the booking (0010), so no new column is
-- needed here — just find each unit's most recently completed booking (by
-- updated_at, i.e. when it was actually marked completed, not its planned
-- return_date) and check whether today has passed its buffer.
create or replace function public.release_cleaned_units()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released integer;
begin
  with latest_return as (
    select distinct on (b.unit_id)
           b.unit_id, b.return_date, b.cleaning_buffer_days
      from public.bookings b
     where b.status = 'completed'
     order by b.unit_id, b.updated_at desc
  ),
  due as (
    update public.item_units u
       set status = 'available'
      from latest_return lr
     where u.id = lr.unit_id
       and u.status = 'under_cleaning'
       and public.today_manila() > (lr.return_date + lr.cleaning_buffer_days)
    returning 1
  )
  select count(*) into released from due;
  return released;
end;
$$;

revoke all on function public.release_cleaned_units() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'release-cleaned-units') then
    -- Daily is enough for day-granularity buffers. 00:00 UTC = 08:00 Manila,
    -- so a unit clears right as the shop day starts.
    perform cron.schedule(
      'release-cleaned-units', '0 0 * * *', 'select public.release_cleaned_units();'
    );
  end if;
end;
$$;
