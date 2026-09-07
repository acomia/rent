-- Phase 4 (cont.) — lock down the booking functions.
-- Apply after 0011_pick_free_unit.sql.
--
-- Two problems the Supabase database linter caught in 0010/0011:
--
--   1. `expire_stale_holds()` is SECURITY DEFINER, DELETES rows, and was
--      reachable by the `anon` role at /rest/v1/rpc/expire_stale_holds. Small
--      blast radius (it only removes holds that have already expired) but it is
--      an unintended public mutation endpoint. It belongs to cron and the
--      service role, nobody else.
--   2. `revoke ... from public` in 0011 did NOT remove anon's access to
--      `pick_free_unit`. Supabase grants EXECUTE to `anon` and `authenticated`
--      explicitly, so revoking from PUBLIC leaves those grants standing — the
--      roles have to be named.
--
-- Also sets search_path on the three `language sql` helpers, which 0010 left
-- mutable.

-- 1. pin search_path -----------------------------------------------------------
alter function public.today_manila() set search_path = public;
alter function public.is_unit_free(uuid, date, date, integer) set search_path = public;
alter function public.item_day_states(uuid, date, date) set search_path = public;

-- 2. trigger functions are not an API -------------------------------------------
-- These only make sense inside a trigger; calling them over RPC does nothing
-- useful and exposing SECURITY DEFINER surface for no reason is careless.
revoke execute on function public.set_booking_cleaning_buffer()      from public, anon, authenticated;
revoke execute on function public.check_booking_unit_matches_item()  from public, anon, authenticated;
revoke execute on function public.check_booking_not_in_past()        from public, anon, authenticated;
revoke execute on function public.freeze_booking_on_customer_update() from public, anon, authenticated;

-- 3. sweeping holds is a scheduled job, not a client action ----------------------
revoke execute on function public.expire_stale_holds() from public, anon, authenticated;

-- 4. picking a unit needs a signed-in customer -----------------------------------
revoke execute on function public.pick_free_unit(uuid, date, date, text) from public, anon;
grant  execute on function public.pick_free_unit(uuid, date, date, text) to authenticated;

-- 5. reading availability is public (the catalog itself is) ----------------------
-- item_day_states leaks no customer data: it returns a day and one of three
-- words. Browsing an item's calendar before signing in is intended.
grant execute on function public.item_day_states(uuid, date, date) to anon, authenticated;
grant execute on function public.today_manila() to anon, authenticated;
