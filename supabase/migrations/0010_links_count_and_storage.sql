-- 0010 — collections.links_count denormalization + Storage bucket for covers.
--
-- Two additions for chantier 10 (Collections & Projects):
--
-- 1. collections.links_count — a denormalized counter of how many user_links
--    sit in a collection. The data model §6 originally left link counts to be
--    computed on demand, but the owner explicitly tranched a trigger-maintained
--    counter for this chantier (spec/decision > the earlier "no column" note),
--    matching the existing links.saves_count pattern (0004). The count is the
--    number of user_links rows whose collection_id = the collection — a "save"
--    placed in that collection, mirroring how the UI counts a collection's Links.
--
-- 2. Storage bucket 'collection-covers' — the FIRST upload surface in the app.
--    Collection cover images live here (public read, since a public collection's
--    cover is world-visible). Writes are owner-scoped by a path convention:
--    <owner_id>/<rest> — RLS on storage.objects checks the first path segment
--    equals auth.uid(), so a user can only write under their own prefix.
--
-- Idempotent: column via IF NOT EXISTS; functions create-or-replace; triggers
-- dropped-then-created; bucket via on-conflict; policies dropped-then-created.

-- ══ 1. collections.links_count ═════════════════════════════════════════════

alter table public.collections
  add column if not exists links_count integer not null default 0;

-- Recount a single collection from source (user_links). Used by backfill and as
-- the safe path for the multi-row edge cases; the trigger below uses targeted
-- +1/-1 deltas for the hot INSERT/DELETE path and full recompute only when a
-- link moves between collections.
create or replace function public.recount_collection_links(coll uuid)
returns void
language sql
as $$
  update public.collections c
     set links_count = (
       select count(*) from public.user_links ul where ul.collection_id = coll
     )
   where c.id = coll;
$$;

-- Maintain collections.links_count on user_links INSERT / UPDATE / DELETE.
--   INSERT  → +1 on the new collection (if any).
--   DELETE  → -1 on the old collection (if any), floored at 0.
--   UPDATE  → if collection_id changed, -1 old / +1 new (a link moved out of one
--             collection into another, or in/out of Unsorted). Other column
--             updates leave the counter untouched.
-- collection_id NULL = Unsorted: not counted against any collection, so a NULL
-- side contributes no delta.
create or replace function public.bump_collection_links_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.collection_id is not null then
      update public.collections set links_count = links_count + 1
        where id = new.collection_id;
    end if;

  elsif tg_op = 'DELETE' then
    if old.collection_id is not null then
      update public.collections set links_count = greatest(links_count - 1, 0)
        where id = old.collection_id;
    end if;

  elsif tg_op = 'UPDATE' then
    -- Only a change of collection_id moves a link between counters.
    if old.collection_id is distinct from new.collection_id then
      if old.collection_id is not null then
        update public.collections set links_count = greatest(links_count - 1, 0)
          where id = old.collection_id;
      end if;
      if new.collection_id is not null then
        update public.collections set links_count = links_count + 1
          where id = new.collection_id;
      end if;
    end if;
  end if;

  return null;  -- AFTER trigger, return value ignored
end;
$$;

drop trigger if exists trg_user_links_collection_count on public.user_links;
create trigger trg_user_links_collection_count
  after insert or update or delete on public.user_links
  for each row execute function public.bump_collection_links_count();

-- Backfill existing collections (none in prod today, but keep the migration
-- correct if run against a populated DB).
do $$
declare
  r record;
begin
  for r in select id from public.collections loop
    perform public.recount_collection_links(r.id);
  end loop;
end;
$$;

-- ══ 2. Storage bucket + policies for collection covers ═════════════════════
-- storage.buckets / storage.objects are provisioned by Supabase. We insert the
-- bucket row and attach RLS policies scoped by the owner-id path prefix.

-- Public bucket: cover images are world-readable (a public collection's cover is
-- shown to anonymous visitors and crawlers). The 5 MiB limit and image mime
-- allowlist keep the surface tight — the only thing uploaded here is a cover.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'collection-covers',
  'collection-covers',
  true,
  5242880,  -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: '<owner_id>/<anything>'. storage.foldername(name)[1] is the
-- first path segment; requiring it to equal auth.uid() means an authenticated
-- user can only write/modify/delete objects under their own uuid prefix, while
-- everyone (anon included) can read (public bucket + permissive SELECT).

-- Public read of covers.
drop policy if exists collection_covers_read on storage.objects;
create policy collection_covers_read on storage.objects
  for select using (bucket_id = 'collection-covers');

-- Owner can upload under their own prefix only.
drop policy if exists collection_covers_insert_owner on storage.objects;
create policy collection_covers_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'collection-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can overwrite (upsert) their own objects.
drop policy if exists collection_covers_update_owner on storage.objects;
create policy collection_covers_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'collection-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'collection-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own objects (e.g. replacing a cover).
drop policy if exists collection_covers_delete_owner on storage.objects;
create policy collection_covers_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'collection-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
