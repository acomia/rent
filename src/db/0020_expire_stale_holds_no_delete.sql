-- Fixes a bug discovered live during Phase 5's final verification pass:
-- payments.booking_id references bookings(id) ON DELETE RESTRICT (0019), so
-- expire_stale_holds()'s DELETE was rejected by Postgres the moment ANY
-- payment attempt (even one long since 'failed', not just 'processing') had
-- ever been recorded for that hold — and because it's one SQL statement over
-- a matched set, that single poisoned row made the ENTIRE sweep fail on
-- every invocation from then on, silently breaking availability for every
-- other expired hold in the table too, not just the one with payment history.
--
-- Fix: transition to 'cancelled' instead of deleting. 'cancelled' is already
-- excluded from bookings_no_overlap (0010), so the dates release identically
-- to a delete — but an UPDATE never touches the FK, so no violation is
-- possible, and the payments audit trail survives instead of vanishing.
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
    update public.bookings b
       set status = 'cancelled', hold_expires_at = null
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

comment on function public.expire_stale_holds() is
  'Cancels checkout holds past their expiry (transitions status to cancelled '
  'rather than deleting — payments.booking_id is ON DELETE RESTRICT, so a '
  'delete would fail once any payment attempt exists for the hold). Call '
  'before availability reads, and scheduled via pg_cron (see 0019).';
