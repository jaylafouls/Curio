-- 0011 — Storage bucket for personal Link images ("Add a custom image").
--
-- The Save Flow (chantier 11) lets a user attach their own image to a saved Link
-- when the OG fetch fails or the auto image is unsuitable (ADD_ITEM_FLOW §2.1 /
-- data model §9 `user_links.custom_image_url`). That upload needs a Storage
-- surface distinct from collection covers.
--
-- Bucket 'user-images':
--   • public read — a custom image sits on a user_link that may live in a PUBLIC
--     collection, so its image must be world-readable exactly like a cover. (RLS
--     on user_links still governs WHICH rows a viewer sees; the image URL is only
--     surfaced through a row the viewer is already allowed to read.)
--   • owner-scoped writes by the '<owner_id>/<...>' path convention — identical
--     mechanism to collection-covers (0010): the first path segment must equal
--     auth.uid(), so a user can only write under their own uuid prefix.
--
-- Same 5 MiB / image-mime allowlist as covers. The Supabase project host already
-- matches next.config's remotePatterns (path-wildcarded on /storage/v1/object/
-- public/**), so next/image loads these with no config change.
--
-- Idempotent: bucket via on-conflict; policies dropped-then-created.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-images',
  'user-images',
  true,
  5242880,  -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of custom images.
drop policy if exists user_images_read on storage.objects;
create policy user_images_read on storage.objects
  for select using (bucket_id = 'user-images');

-- Owner can upload under their own '<uid>/…' prefix only.
drop policy if exists user_images_insert_owner on storage.objects;
create policy user_images_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can overwrite (upsert) their own objects.
drop policy if exists user_images_update_owner on storage.objects;
create policy user_images_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own objects (e.g. replacing an image).
drop policy if exists user_images_delete_owner on storage.objects;
create policy user_images_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
