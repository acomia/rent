-- Phase 3 — Admin audit log.
-- Apply after 0006_admins.sql in the Supabase SQL editor.
--
-- Design notes:
--   * Every mutation to the catalog tables (items / item_units / categories) is
--     recorded by a DB trigger, NOT by client code. This is deliberate: a screen
--     that forgets to log, or a direct SQL edit, still leaves a trail. The
--     trigger runs as SECURITY DEFINER so it can insert past the log's RLS.
--   * `actor_id` is `auth.uid()` — the admin who made the change. It may be null
--     for changes made from the SQL editor / service role (no JWT); that's fine
--     and still worth recording.
--   * `changes` stores the full row snapshot: the new row on insert/update, the
--     old row on delete. Enough to reconstruct what happened without a diff.
--   * `record_id` is text, not uuid: items/item_units key on a uuid `id` but
--     categories key on a text `slug`, so the key is pulled from the snapshot
--     generically (`id` or `slug`) rather than referencing a fixed column.

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  table_name  text not null,
  record_id   text,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_record_idx
  on public.admin_audit_log (table_name, record_id);

-- trigger fn: capture the acting admin + row snapshot -------------------------
create or replace function public.log_admin_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot   jsonb := to_jsonb(coalesce(new, old));
  key        text := coalesce(snapshot ->> 'id', snapshot ->> 'slug');
begin
  insert into public.admin_audit_log (actor_id, action, table_name, record_id, changes)
  values (auth.uid(), lower(tg_op), tg_table_name, key, snapshot);
  -- AFTER trigger: return value is ignored, but keep it well-formed.
  return coalesce(new, old);
end;
$$;

-- attach to each catalog table ------------------------------------------------
drop trigger if exists items_audit on public.items;
create trigger items_audit
  after insert or update or delete on public.items
  for each row execute function public.log_admin_action();

drop trigger if exists item_units_audit on public.item_units;
create trigger item_units_audit
  after insert or update or delete on public.item_units
  for each row execute function public.log_admin_action();

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.log_admin_action();

-- row-level security ----------------------------------------------------------
-- Admins can read the log (a viewer UI lands in Phase 8). No client writes —
-- rows are inserted only by the SECURITY DEFINER trigger above.
alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select
  using (public.is_admin());
