-- Phase 3 — Invite-code-gated admin signup.
-- Apply after 0006_admins.sql in the Supabase SQL editor.
--
-- Design notes:
--   * The `admins` table still has NO client write path (0006). Admin rows are
--     created only by the SECURITY DEFINER signup trigger below, and only when a
--     valid, active invite code is supplied — so a signup role picker can never
--     let a stranger self-promote to admin.
--   * `admin_invite_codes` is fully locked to clients: RLS is enabled with no
--     policies, so anon/authenticated cannot read or guess codes. The trigger
--     and the verify RPC are SECURITY DEFINER, so they read it regardless.
--   * The code travels in signup metadata (`raw_user_meta_data.admin_invite_code`)
--     — user-controlled, but only a server-side match against this table grants
--     admin, and a supplied-but-invalid code aborts the whole signup.
--   * Codes are reusable while `active`; revoke by flipping `active` to false.
--     Make them long and random (they are a shared secret). Manage them by hand
--     in the dashboard for v1.

-- invite codes ----------------------------------------------------------------
create table if not exists public.admin_invite_codes (
  code        text primary key,
  role        text not null default 'owner'
                check (role in ('owner', 'staff')),
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now()
);

-- Locked to clients: RLS on, no policies. Only SECURITY DEFINER functions read it.
alter table public.admin_invite_codes enable row level security;

-- provision a customer (and maybe an admin) on signup ------------------------
-- Replaces the 0001 version: same customer provisioning, plus optional admin
-- creation when a valid invite code is present. A supplied-but-invalid code
-- raises, which rolls back the whole signup (no orphaned auth user / customer).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted boolean := coalesce(
    (new.raw_user_meta_data ->> 'accepted_terms')::boolean, false);
  invite text := nullif(trim(new.raw_user_meta_data ->> 'admin_invite_code'), '');
  invite_role text;
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

  -- Optional admin provisioning, gated by a valid invite code.
  if invite is not null then
    select role into invite_role
    from public.admin_invite_codes
    where code = invite and active = true;

    if invite_role is null then
      raise exception 'Invalid or inactive invite code'
        using errcode = 'check_violation';
    end if;

    insert into public.admins (id, role)
    values (new.id, invite_role)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- verify RPC (pre-check for the signup screen) --------------------------------
-- Lets the client validate a code before calling signUp so it can show a clean
-- inline error instead of a generic "database error". The trigger re-checks
-- server-side regardless, so this is convenience, not the enforcement point.
create or replace function public.verify_admin_invite_code(invite_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_invite_codes
    where code = invite_code and active = true
  );
$$;

grant execute on function public.verify_admin_invite_code(text) to anon, authenticated;

-- Example (run manually to mint a code; replace with a long random value):
--   insert into public.admin_invite_codes (code, role, note)
--   values ('CHANGE-ME-TO-SOMETHING-LONG-AND-RANDOM', 'owner', 'shop owner');
