-- Home screen — shop identity, hero slides, and announcements.
-- Apply after 0015_storage_avatars.sql.
--
-- Design notes:
--   * Everything here is EDITORIAL: content the shop changes without a release.
--     Hardcoding it in the app would mean a store move or a new banner needs a
--     store submission, which for a single PH shop is absurd.
--   * `shop_settings` is a singleton, enforced by a one-row primary key rather
--     than by convention. The app had no record of the shop itself — no address,
--     no pickup hours — so "Pick up at Makati" and "Visit store" had nowhere to
--     read from.
--   * All three are PUBLIC READ: a customer browses before signing in, and the
--     hero is the first thing they see. Writes are admin-only via is_admin().
--   * `is_active` plus a date window on announcements means the shop schedules a
--     banner rather than remembering to delete it.

-- shop_settings — exactly one row ---------------------------------------------
create table if not exists public.shop_settings (
  id            boolean primary key default true check (id),
  name          text not null default 'Renta',
  address_line  text,
  city          text,
  /** Short label used inline, e.g. "Pick up at Makati". */
  pickup_label  text,
  /** Opens a maps app; kept as a URL so the shop can point it anywhere. */
  map_url       text,
  phone         text,
  /** The shop's standard pickup window, shown on an upcoming booking. */
  pickup_from   time,
  pickup_to     time,
  updated_at    timestamptz not null default now()
);

drop trigger if exists shop_settings_set_updated_at on public.shop_settings;
create trigger shop_settings_set_updated_at
  before update on public.shop_settings
  for each row execute function public.set_updated_at();

-- home_slides — the hero carousel ---------------------------------------------
create table if not exists public.home_slides (
  id          uuid primary key default gen_random_uuid(),
  headline    text not null,
  subhead     text,
  cta_label   text,
  /** An in-app route, e.g. '/categories'. Not a URL — this navigates. */
  cta_route   text,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists home_slides_active_idx
  on public.home_slides (sort_order)
  where is_active;

-- announcements ---------------------------------------------------------------
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text,
  action_label  text,
  action_url    text,
  is_active     boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint announcements_window_ordered
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- row-level security ----------------------------------------------------------
alter table public.shop_settings enable row level security;
alter table public.home_slides   enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "shop_settings_select_all" on public.shop_settings;
create policy "shop_settings_select_all"
  on public.shop_settings for select using (true);

drop policy if exists "shop_settings_write_admin" on public.shop_settings;
create policy "shop_settings_write_admin"
  on public.shop_settings for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "home_slides_select_active" on public.home_slides;
create policy "home_slides_select_active"
  on public.home_slides for select using (is_active);

drop policy if exists "home_slides_write_admin" on public.home_slides;
create policy "home_slides_write_admin"
  on public.home_slides for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Only announcements that are live right now are visible to a customer.
drop policy if exists "announcements_select_live" on public.announcements;
create policy "announcements_select_live"
  on public.announcements for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "announcements_write_admin" on public.announcements;
create policy "announcements_write_admin"
  on public.announcements for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- seed ------------------------------------------------------------------------
insert into public.shop_settings (
  id, name, address_line, city, pickup_label, map_url, phone,
  pickup_from, pickup_to
)
values (
  true, 'Renta', 'Glorietta 3, Ayala Center', 'Makati', 'Makati',
  'https://maps.google.com/?q=Glorietta+3+Ayala+Center+Makati',
  '+63 2 8123 4567', time '10:00', time '19:00'
)
on conflict (id) do nothing;

-- Slides borrow photos from real stock so the hero never renders empty and the
-- imagery stays consistent with the catalog.
insert into public.home_slides (headline, subhead, cta_label, cta_route, image_url, sort_order)
select s.headline, s.subhead, s.cta_label, s.cta_route,
       (select i.photos[1]
          from public.items i
         where i.category_slug = s.cat
           and coalesce(array_length(i.photos, 1), 0) > 0
         order by i.created_at
         limit 1),
       s.sort_order
  from (values
    ('Wear more moments',
     'Gowns and costumes for life''s special days',
     'Explore looks', '/categories', 'gowns', 1),
    ('Dressed for the debut',
     'Ball gowns and formal wear, ready when you are',
     'See gowns', '/categories', 'gowns', 2),
    ('Become anyone',
     'Costumes for conventions, themed nights and school days',
     'See costumes', '/categories', 'costumes', 3)
  ) as s(headline, subhead, cta_label, cta_route, cat, sort_order)
 where not exists (select 1 from public.home_slides);

insert into public.announcements (title, body, action_label, action_url)
select 'New Makati store',
       'Visit our new and bigger showroom at Glorietta 3.',
       'Get directions',
       'https://maps.google.com/?q=Glorietta+3+Ayala+Center+Makati'
 where not exists (select 1 from public.announcements);
