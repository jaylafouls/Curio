-- 0013 — Storage bucket for user avatars ("Profile" edit in /settings, chantier
-- 13). The avatar upload uses the SAME mechanism as collection covers (0010) and
-- user images (0011): client → Storage, owner-scoped by the '<uid>/…' path
-- prefix, only the resulting public URL reaches the profile update Server Action.
--
-- Bucket 'avatars':
--   • public read — an avatar is shown on public profiles (§8.10) and crawlable
--     curator pages, so it must be world-readable exactly like a cover.
--   • owner-scoped writes by the '<owner_id>/<…>' convention: the first path
--     segment must equal auth.uid(), so a user only writes under their own uuid
--     prefix. This same prefix is what the delete-account purge targets.
--
-- Same 5 MiB / image-mime allowlist as covers. The Supabase host already matches
-- next.config's remotePatterns (path-wildcarded on /storage/v1/object/public/**),
-- so next/image loads these with no config change.
--
-- Idempotent: bucket via on-conflict; policies dropped-then-created.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of avatars.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

-- Owner can upload under their own '<uid>/…' prefix only.
drop policy if exists avatars_insert_owner on storage.objects;
create policy avatars_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can overwrite (upsert) their own objects.
drop policy if exists avatars_update_owner on storage.objects;
create policy avatars_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own objects (replacing an avatar / account purge).
drop policy if exists avatars_delete_owner on storage.objects;
create policy avatars_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
