-- Phase 2 — Catalog schema: categories, items (designs), item_units.
-- Apply in the Supabase SQL editor (or `supabase db push`) against the dev project.
--
-- Design notes:
--   * Inventory model is "design + units" (Open Item #1): an `items` row is a
--     design/listing; each physical copy is an `item_units` row carrying its own
--     size + status. This is what the availability + booking work (Phase 4)
--     builds on, so the split lands now even though Phase 2 only reads it.
--   * Categories are item-type (gowns/costumes/...); `occasion` is a separate
--     free tag array on items so the Phase 2 filter sheet can slice by both.
--   * `photos` is present but empty in v1 — items render via the `icon`+`tint`
--     glyph placeholder. Real photo upload lands in Phase 3 (admin + Storage).
--   * Catalog is public read; there are no client write policies. Admin writes
--     (insert/update/delete) arrive with the admin role work in Phase 3.
--   * Reuses `public.set_updated_at()` defined in 0001_customers.sql.

-- categories -----------------------------------------------------------------
create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  icon        text not null,                        -- MaterialCommunityIcons glyph
  tint        text not null
                check (tint in ('lilac', 'sky', 'blush', 'butter')),
  sort_order  integer not null default 0
);

-- items (design level) -------------------------------------------------------
create table if not exists public.items (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  brand                 text,
  category_slug         text not null references public.categories (slug),
  gender                text not null
                          check (gender in ('women', 'men')),
  rental_fee_per_day    numeric(10, 2) not null
                          check (rental_fee_per_day >= 0),
  deposit               numeric(10, 2) not null default 0
                          check (deposit >= 0),
  cleaning_buffer_days  integer not null default 0   -- used by availability (Phase 4)
                          check (cleaning_buffer_days >= 0),
  description           text,
  occasion              text[] not null default '{}',  -- wedding/debut/formal/cosplay/school
  swatches              text[] not null default '{}',  -- hex color chips
  photos                text[] not null default '{}',  -- URLs; empty in v1 (glyph fallback)
  icon                  text not null,               -- MaterialCommunityIcons glyph
  tint                  text not null
                          check (tint in ('lilac', 'sky', 'blush', 'butter')),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists items_category_idx on public.items (category_slug);
create index if not exists items_active_idx on public.items (is_active);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- item_units (physical copies) -----------------------------------------------
create table if not exists public.item_units (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items (id) on delete cascade,
  size        text,
  color       text,
  status      text not null default 'available'
                check (status in (
                  'available', 'reserved', 'rented',
                  'under_cleaning', 'damaged', 'unavailable'
                )),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists item_units_item_idx on public.item_units (item_id);

drop trigger if exists item_units_set_updated_at on public.item_units;
create trigger item_units_set_updated_at
  before update on public.item_units
  for each row execute function public.set_updated_at();

-- row-level security ----------------------------------------------------------
-- Catalog is public read. Write access is admin-only and arrives in Phase 3;
-- until then there are no insert/update/delete policies, so the anon/auth
-- roles cannot mutate the catalog.
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_units enable row level security;

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all"
  on public.categories for select
  using (true);

drop policy if exists "items_select_all" on public.items;
create policy "items_select_all"
  on public.items for select
  using (true);

drop policy if exists "item_units_select_all" on public.item_units;
create policy "item_units_select_all"
  on public.item_units for select
  using (true);
