-- Size-aware availability — and the fix that makes it mean anything.
--
-- Two problems live in one function:
--
--   1. NOT SIZE-AWARE. `item_day_states` reported availability across EVERY
--      unit of a design, while `pick_free_unit` filters by the size the
--      customer chose. So a customer who picked M could be shown a date as
--      available because an L was free, walk the entire reserve flow, and be
--      refused at the final insert with a SlotTakenError. "What size is it" is
--      the FIRST question a customer asks (see the Observed Workflow section of
--      `project-scope.md`), which made this the most likely way the app failed
--      the exact person it exists to serve.
--
--   2. IT COULD NOT SEE OTHER CUSTOMERS' BOOKINGS. The function was SECURITY
--      INVOKER, and `public.bookings` has RLS letting a customer select only
--      their own rows. The `blocks` join therefore skipped every other
--      customer's booking: taken days rendered as available, and for `anon` —
--      who may call this before signing in, by design — every day looked free.
--      This is the trap `0011_pick_free_unit.sql` already documents one
--      function over ("RLS hides other customers' bookings, so a client-side
--      freeness check would confidently pick a taken unit").
--
--      SECURITY DEFINER is required for the answer to be true. It is safe here
--      for the reason `0012` already gives when it grants this function to
--      `anon`: it returns a day and one of three words, never a customer, a
--      booking, or a reference. `search_path` is pinned, per the lesson of 0012.
--
-- Neither fix helps the other: size-scoping a calendar that cannot see the
-- bookings that matter would just be a more precise wrong answer.
--
-- The signature changes, so the old function is dropped rather than replaced.
-- Adding a defaulted parameter alongside it would leave two candidates and make
-- every existing three-argument call ambiguous ("function is not unique").
-- Re-running this file is safe: the drop is guarded and the create replaces.

drop function if exists public.item_day_states(uuid, date, date);

-- The shop tracks six inventory states; a customer only needs three. A day is
-- 'available' when at least one sellable unit of the design -- of the requested
-- size, when one is requested -- is free that day. When every candidate unit is
-- blocked, the day reads 'cleaning' if any of those blocks is a post-return
-- buffer, otherwise 'unavailable'.
create or replace function public.item_day_states(
  p_item_id uuid,
  p_from    date,
  p_to      date,
  p_size    text default null
)
returns table (day date, state text)
language sql
security definer
set search_path = public
stable
as $$
  with units as (
    select u.id
      from public.item_units u
     where u.item_id = p_item_id
       and u.status not in ('damaged', 'unavailable')
       -- A null size means "any copy". That is also the correct answer for a
       -- one-size design: those units carry size = null and the product screen
       -- never sets a size, so the customer keeps seeing the whole design.
       and (p_size is null or u.size = p_size)
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
           -- No unit in that size, or none sellable: nothing to offer. The
           -- customer sees a fully blocked month rather than a promise the
           -- final insert would refuse.
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

-- Least privilege: a new function grants EXECUTE to PUBLIC by default, and on
-- Supabase revoking from `public` does NOT remove `anon`'s access -- the roles
-- must be named. Reading an item's calendar before signing in is intended.
revoke all on function public.item_day_states(uuid, date, date, text) from public;
grant execute on function public.item_day_states(uuid, date, date, text)
  to anon, authenticated;

comment on function public.item_day_states(uuid, date, date, text) is
  'Per-day customer calendar state (available / cleaning / unavailable) for a '
  'design, optionally narrowed to one size. SECURITY DEFINER because RLS hides '
  'other customers'' bookings from the caller; it returns no customer data. '
  'Advisory only -- the bookings_no_overlap exclusion constraint is what '
  'actually prevents a double booking.';

-- EXPECTED ADVISOR WARNING. `get_advisors` (security) now flags this function
-- under `anon_security_definer_function_executable` and its `authenticated`
-- twin, alongside `is_admin`, `pick_free_unit` and `verify_admin_invite_code`.
-- That is intentional and is the trade this file exists to make: an
-- unauthenticated caller can ask which days an item is blocked, which is what a
-- public availability calendar is. The function returns a day and one of three
-- words -- no customer, no booking reference, no count. Do not "fix" the warning
-- by reverting to SECURITY INVOKER; that reintroduces the bug above.

-- Deliberately no new index. The units CTE now filters on
-- (item_id, size, status), which would suit a composite index, but
-- `item_units` holds one row per physical garment -- 30 in the dev project, a
-- few hundred for a real single shop. The existing `item_units_item_idx` on
-- (item_id) is enough at that size, and an index that never pays for itself is
-- still write cost on every admin edit. Revisit if a shop's inventory grows by
-- an order of magnitude.
