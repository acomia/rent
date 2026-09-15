-- Follow-up to 0020: expire_stale_holds()'s guard only excluded a hold with a
-- 'processing' payment, not a 'paid' one.
--
-- Why a 'paid' row can exist on a hold that is still 'hold': paymongo-webhook's
-- payment.paid handling is two separate, non-atomic writes — mark the
-- `payments` row 'paid', then advance the booking from 'hold' to 'pending' —
-- and the webhook dedupes by event id BEFORE either write happens. If the
-- process is interrupted between the two writes (crash, timeout), a PayMongo
-- retry of the same event is silently deduped without ever retrying the
-- booking advance, leaving a booking stuck at status='hold' with a genuinely
-- 'paid' payment attached. (This non-atomic two-step write is a separate,
-- bigger architectural issue and is NOT fixed here — out of scope.)
--
-- Under 0020's UPDATE-based sweep, that row was NOT protected ('paid' !=
-- 'processing'), so once hold_expires_at passed, the sweep would silently
-- cancel a genuinely paid booking — silent money loss with no error, no
-- trace. Extending the guard to also exclude 'paid' converts the failure
-- mode to "stays stuck at hold, visible in the admin queue for a human to
-- resolve" — the safe direction to fail in.
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
            and p.status in ('processing', 'paid')
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
  'delete would fail once any payment attempt exists for the hold). Skips a '
  'hold with a processing OR already-paid payment, so a webhook that has not '
  'yet advanced the booking cannot have its paid deposit silently cancelled '
  '(0021). Call before availability reads, and scheduled via pg_cron (see '
  '0019).';
