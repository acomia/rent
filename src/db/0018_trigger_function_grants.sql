-- Finish the job 0012 started: trigger functions are not an API.
--
-- `0012_booking_function_hardening.sql` revoked RPC access from the trigger
-- functions it knew about, on the principle that "calling them over RPC does
-- nothing useful and exposing SECURITY DEFINER surface for no reason is
-- careless". It covered four. Three were missed, and `get_advisors` has been
-- reporting two of them ever since:
--
--   handle_new_user()    SECURITY DEFINER, callable by anon + authenticated
--   log_admin_action()   SECURITY DEFINER, callable by anon + authenticated
--   set_updated_at()     callable by anon + authenticated, AND the last
--                        function in the schema with a mutable search_path
--
-- Exploitability is low — Postgres refuses to execute a trigger function called
-- directly, because TG_OP and NEW are unset — so this is surface reduction and
-- consistency rather than an incident. It is worth closing before Phase 5 adds
-- a payments webhook, because that is the moment the schema stops being only
-- ours and every needless RPC entry point becomes something to reason about.
--
-- Reminder from 0012, still true: on Supabase `revoke ... from public` does NOT
-- remove anon's access. The roles are granted explicitly, so they must be
-- named explicitly.

revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.log_admin_action() from public, anon, authenticated;
revoke execute on function public.set_updated_at()   from public, anon, authenticated;

-- Pin the last mutable search_path in the schema. `set_updated_at` is SECURITY
-- INVOKER, so this is not the privilege-escalation shape the linter warns about
-- most loudly, but an unqualified `now()` resolving through a caller-controlled
-- search_path is the same class of mistake and costs nothing to close.
alter function public.set_updated_at() set search_path = public;

-- Not changed, deliberately:
--
--   * `is_admin()` and `verify_admin_invite_code()` stay callable by anon. Both
--     are SECURITY DEFINER and both show up in the advisor's
--     `anon_security_definer_function_executable` list, which is expected:
--     `is_admin()` is the helper every admin RLS policy calls, and signup needs
--     to verify an invite code before a session exists.
--   * `item_day_states()` stays callable by anon — see the note in
--     `0017_item_day_states_size.sql`.
--   * `admin_invite_codes` keeps RLS enabled with no policies, which the advisor
--     reports as INFO. That is deny-all by design: only the SECURITY DEFINER
--     `verify_admin_invite_code()` reads it. Adding a policy would weaken it.
