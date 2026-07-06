-- Phase 3 — Admins + catalog write access.
-- Apply in the Supabase SQL editor (or `supabase db push`) against the dev project.
--
-- Design notes:
--   * A single `admins` table keyed 1:1 to `auth.users`. Presence of a row =
--     the account is an admin (Open Item #8: single-role for v1). The `role`
--     column is unused by v1 logic but present so an owner/staff split can land
--     later with no migration — same "bolt on later" pattern as the KYC columns
--     in 0001_customers.sql.
--   * `public.is_admin()` is the single source of truth for the check, so every
--     write policy reads the same way and RLS stays legible. SECURITY DEFINER so
--     it can read `admins` regardless of the caller's row visibility.
--   * The catalog tables (items / item_units / categories) got public SELECT
--     policies in 0002 and no write policies. This migration adds admin-only
--     INSERT/UPDATE/DELETE. Anon/auth (non-admin) users still cannot mutate.
--   * The FIRST admin is provisioned by hand in the Supabase dashboard (there is
--     no client insert path — chicken-and-egg). See README.

-- admins ----------------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'owner'
                check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now()
);

-- is_admin() — the shared predicate used by every admin write policy ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where id = auth.uid()
  );
$$;

-- row-level security ----------------------------------------------------------
alter table public.admins enable row level security;

-- Admins can see the admin roster (used by the app to resolve the current
-- user's admin status and, later, for owner/staff management). No client
-- insert/update/delete — provisioning is manual in the dashboard for v1.
drop policy if exists "admins_select_admin" on public.admins;
create policy "admins_select_admin"
  on public.admins for select
  using (public.is_admin());

-- catalog write access (admin-only) -------------------------------------------
-- SELECT stays public (policies from 0002_catalog.sql are untouched). These add
-- the write side the admin catalog UI needs.

drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "items_write_admin" on public.items;
create policy "items_write_admin"
  on public.items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "item_units_write_admin" on public.item_units;
create policy "item_units_write_admin"
  on public.item_units for all
  using (public.is_admin())
  with check (public.is_admin());
