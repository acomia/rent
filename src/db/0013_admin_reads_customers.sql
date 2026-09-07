-- Phase 4 (cont.) — let the shop see who booked.
-- Apply after 0012_booking_function_hardening.sql.
--
-- Design notes:
--   * `customers` shipped in 0001 with `customers_select_own` as its only SELECT
--     policy, which is correct for a customer and useless for the shop: an admin
--     opening Booking Management could read the booking but not the name of the
--     person who made it. Every row joined through `bookings -> customers` came
--     back null.
--   * This is scope #24 (Customer Management) arriving early because Booking
--     Management cannot function without it.
--   * SELECT only. Admins still cannot UPDATE or DELETE a customer row — profile
--     data stays the customer's to change, and there is no admin path to edit
--     someone's details or forge consent timestamps.
--   * `is_admin()` is wrapped in a subselect so the planner evaluates it once per
--     query rather than once per row.

drop policy if exists "customers_select_admin" on public.customers;
create policy "customers_select_admin"
  on public.customers for select
  using ((select public.is_admin()));
