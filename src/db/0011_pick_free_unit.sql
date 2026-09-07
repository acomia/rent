-- Phase 4 (cont.) — choosing which physical copy a booking gets.
-- Apply after 0010_bookings.sql.
--
-- Design notes:
--   * A customer picks a design and a date range; the shop decides which unit.
--     The app cannot make that choice itself: `bookings` RLS hides other
--     customers' rows, so a client-side "is this unit free?" query sees only
--     its own bookings and would happily pick a unit that is already taken —
--     the insert would then bounce off the exclusion constraint.
--   * SECURITY DEFINER so the check sees every booking, while still returning
--     nothing but a unit id. It leaks no other customer's data.
--   * This is a convenience, NOT the safety net. The exclusion constraint in
--     0010 remains the only thing that actually prevents a double booking: two
--     callers can be handed the same free unit in the same instant, and exactly
--     one of their inserts will win.

create or replace function public.pick_free_unit(
  p_item_id uuid,
  p_pickup  date,
  p_return  date,
  p_size    text default null
)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.id
    from public.item_units u
    join public.items i on i.id = u.item_id
   where u.item_id = p_item_id
     and u.status not in ('damaged', 'unavailable')
     and (p_size is null or u.size = p_size)
     and not exists (
       select 1
         from public.bookings b
        where b.unit_id = u.id
          and b.status not in ('cancelled', 'rejected')
          and b.blocked_range && daterange(
                p_pickup,
                (p_return + i.cleaning_buffer_days + 1),
                '[)')
     )
   order by u.size nulls last, u.id
   limit 1;
$$;

comment on function public.pick_free_unit(uuid, date, date, text) is
  'Returns one unit of the design that is free for the range (cleaning buffer '
  'included), or null if none are. Convenience only — the exclusion constraint '
  'on public.bookings is what actually prevents double booking.';

revoke all on function public.pick_free_unit(uuid, date, date, text) from public;
grant execute on function public.pick_free_unit(uuid, date, date, text)
  to authenticated;
