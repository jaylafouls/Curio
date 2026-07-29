-- 0008 — collections.slug (public-URL slug for /collections/[slug]).
--
-- Adds a human-readable, stable, unique slug to collections so the SEO sitemap
-- (app/sitemap.ts) can index public collections by slug instead of uuid. The
-- real /collections/[slug] route follows in a later chantier; the column +
-- sitemap must be ready now while prod holds zero collections (decision D004).
--
-- Slug rules (per owner's D004 note):
--   • generated from `name` (the collections table's human title column),
--   • lowercased, non-alphanumerics collapsed to single hyphens, trimmed,
--   • empty/degenerate names fall back to 'collection',
--   • unique: on collision, append '-2', '-3', ... until free.
--
-- Idempotent: column add guarded by IF NOT EXISTS; function via create-or-
-- replace; trigger dropped-then-created; backfill only touches NULL slugs.

-- ── slugify helper ─────────────────────────────────────────────────────────
-- Deterministic base slug from arbitrary text. Not unique on its own — the
-- uniqueness suffix is applied by the assign trigger / backfill below.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      -- lower → replace any run of non-alphanumerics with a hyphen → trim hyphens
      trim(both '-' from
        regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')
      ),
      ''
    ),
    'collection'  -- fallback when the name has no slug-able characters
  );
$$;

-- ── returns a slug unique across collections, suffixing on collision ───────
-- exclude_id lets an UPDATE keep its own row's slug out of the collision check.
create or replace function public.collections_unique_slug(base text, exclude_id uuid)
returns text
language plpgsql
stable
as $$
declare
  candidate text := base;
  n int := 1;
begin
  loop
    perform 1 from public.collections
      where slug = candidate
        and (exclude_id is null or id <> exclude_id);
    if not found then
      return candidate;
    end if;
    n := n + 1;
    candidate := base || '-' || n;   -- name, name-2, name-3, ...
  end loop;
end;
$$;

-- ── column: nullable first so the add never fails on existing rows ─────────
alter table public.collections
  add column if not exists slug text;

-- ── trigger: fill/normalise slug on write ──────────────────────────────────
-- On INSERT: if slug not supplied, derive from name; always ensure uniqueness.
-- On UPDATE: only recompute when slug was explicitly cleared (set to NULL) —
-- an existing slug is a stable public URL and must not silently change when the
-- name is edited (URL stability, brief rule 1). Callers wanting a reslug set
-- slug = NULL explicitly.
create or replace function public.collections_assign_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null then
    new.slug := public.collections_unique_slug(public.slugify(new.name), new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_collections_assign_slug on public.collections;
create trigger trg_collections_assign_slug
  before insert or update on public.collections
  for each row execute function public.collections_assign_slug();

-- ── backfill any pre-existing rows (none in prod today, but keep it correct)
-- Row-by-row so the uniqueness suffix accounts for slugs assigned earlier in
-- the same pass. Ordered by created_at so the earliest collection keeps the
-- bare slug and later duplicates get the -2/-3 suffix.
do $$
declare
  r record;
begin
  for r in
    select id, name from public.collections where slug is null order by created_at
  loop
    update public.collections
      set slug = public.collections_unique_slug(public.slugify(r.name), r.id)
      where id = r.id;
  end loop;
end;
$$;

-- ── enforce not-null + unique now that every row has a slug ─────────────────
alter table public.collections
  alter column slug set not null;

-- Unique index (also backs the collision lookup above). IF NOT EXISTS keeps the
-- migration re-runnable.
create unique index if not exists collections_slug_key
  on public.collections (slug);
