-- Profile screens — customer avatar storage.
-- Apply after 0014_customer_profile_fields.sql.
--
-- Design notes:
--   * Bucket `avatars`, public read. An avatar is shown next to a customer's
--     name on screens the shop can see, so the URL has to resolve without a
--     per-request signature.
--   * Object path convention: `{userId}/{uuid}.<ext>`. The FIRST path segment is
--     the owner's id, and every write policy checks it against `auth.uid()` —
--     that is what stops one customer overwriting another's photo. Public read
--     does NOT imply public write.
--   * Admins are given no write access here on purpose: a shop has no business
--     changing a customer's photo.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Write only inside your own folder. `storage.foldername()` returns the path
-- segments; [1] is the owner id by the convention above.
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
