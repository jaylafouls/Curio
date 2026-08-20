-- 0018 — projects.cover_image_url + Storage bucket for project covers.
--
-- Point 8 of the My Universe review: a Project can carry a custom cover image,
-- mirroring collections. Two additions, both minimal and idempotent:
--
-- 1. projects.cover_image_url (nullable text) — the public URL of the uploaded
--    cover, or NULL to fall back to the project's colour pastille. Projects are
--    ALWAYS private (data model §5), but the cover image itself is world-
--    readable like a collection cover: RLS on the projects row still governs who
--    ever sees the URL, so a private project's cover is only surfaced to its
--    owner. Public bucket keeps the Storage/next.config story identical to
--    covers (no remotePatterns change).
--
-- 2. Storage bucket 'project-covers' — public read, owner-scoped writes by the
--    '<owner_id>/<...>' path convention, identical mechanism to 0010/0011.
--
-- Idempotent: column via IF NOT EXISTS; bucket via on-conflict; policies
-- dropped-then-created.

-- ══ 1. projects.cover_image_url ════════════════════════════════════════════

alter table public.projects
  add column if not exists cover_image_url text;

-- ══ 2. Storage bucket + policies for project covers ════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-covers',
  'project-covers',
  true,
  5242880,  -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of project covers.
drop policy if exists project_covers_read on storage.objects;
create policy project_covers_read on storage.objects
  for select using (bucket_id = 'project-covers');

-- Owner can upload under their own '<uid>/…' prefix only.
drop policy if exists project_covers_insert_owner on storage.objects;
create policy project_covers_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can overwrite (upsert) their own objects.
drop policy if exists project_covers_update_owner on storage.objects;
create policy project_covers_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own objects (e.g. replacing a cover).
drop policy if exists project_covers_delete_owner on storage.objects;
create policy project_covers_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
