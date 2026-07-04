-- Phase 1 — Customers, provisioning, and RLS.
-- Apply in the Supabase SQL editor (or `supabase db push`) against the dev project.
--
-- Design notes:
--   * `customers.id` mirrors `auth.users.id` 1:1 (cascade delete).
--   * The row is created by a trigger on `auth.users` insert, NOT by the client,
--     so it exists atomically with the account even if the app dies mid-signup.
--   * Consent (terms/privacy) is stamped in that same trigger from signup
--     metadata, so acceptance is atomic with account creation.
--   * `id_document_url` / `deposit_tier` are left for KYC options B/C — unused in
--     v1 (OTP-only), present now so they bolt on later with no migration churn.

create table if not exists public.customers (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null,
  phone_number        text,
  email               text,
  address             text,
  id_document_url     text,                       -- KYC option B (later)
  deposit_tier        text not null default 'full'
                        check (deposit_tier in ('full', 'reduced')),
  terms_accepted_at   timestamptz,
  privacy_accepted_at timestamptz,
  terms_version       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- keep updated_at honest -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- provision a customer row on signup -----------------------------------------
-- SECURITY DEFINER so it can insert past RLS; runs as the function owner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted boolean := coalesce(
    (new.raw_user_meta_data ->> 'accepted_terms')::boolean, false);
begin
  insert into public.customers (
    id, full_name, phone_number, email, terms_version,
    terms_accepted_at, privacy_accepted_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone_number',
    new.email,
    new.raw_user_meta_data ->> 'terms_version',
    case when accepted then now() end,
    case when accepted then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- row-level security ----------------------------------------------------------
alter table public.customers enable row level security;

-- A customer can read only their own row.
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own"
  on public.customers for select
  using (auth.uid() = id);

-- A customer can update only their own row. (INSERT is trigger-owned; DELETE is
-- cascade-owned — neither is granted to the client. Admin policies land Phase 3.)
drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own"
  on public.customers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
