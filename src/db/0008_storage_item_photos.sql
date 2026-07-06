-- Phase 3 — Item photo storage.
-- Apply after 0006_admins.sql in the Supabase SQL editor.
--
-- Design notes:
--   * A single public-read bucket `item-photos`. The catalog is public, so photo
--     URLs must resolve without auth — reads are open; only admins can
--     write/delete objects (guarded by public.is_admin() from 0006).
--   * Object path convention: `{itemId}/{uuid}.<ext>`. Grouping by item id keeps
--     an item's photos together and makes cleanup on item delete straightforward.
--   * The public URL of each object is stored in `items.photos text[]` (the
--     column added in 0002_catalog.sql). The catalog UI already renders the
--     first photo when present and falls back to the glyph otherwise.
--   * Idempotent: the bucket upsert and `drop policy if exists` make re-running safe.

-- bucket ----------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = excluded.public;

-- object policies -------------------------------------------------------------
-- Public read so catalog photos resolve for anon/auth users alike.
drop policy if exists "item_photos_read_public" on storage.objects;
create policy "item_photos_read_public"
  on storage.objects for select
  using (bucket_id = 'item-photos');

-- Admin-only write/update/delete.
drop policy if exists "item_photos_insert_admin" on storage.objects;
create policy "item_photos_insert_admin"
  on storage.objects for insert
  with check (bucket_id = 'item-photos' and public.is_admin());

drop policy if exists "item_photos_update_admin" on storage.objects;
create policy "item_photos_update_admin"
  on storage.objects for update
  using (bucket_id = 'item-photos' and public.is_admin())
  with check (bucket_id = 'item-photos' and public.is_admin());

drop policy if exists "item_photos_delete_admin" on storage.objects;
create policy "item_photos_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'item-photos' and public.is_admin());
