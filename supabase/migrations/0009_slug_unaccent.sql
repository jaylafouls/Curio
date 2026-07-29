-- 0009 — unaccent the collection slug (Cafés → cafes, not caf-s).
--
-- 0008 slugified from `name` by collapsing every non-[a-z0-9] run to a hyphen.
-- That is correct for punctuation/spaces but wrong for accented Latin letters:
-- "Cafés" produced "caf-s" (the é, an out-of-range char, became a hyphen)
-- instead of the readable "cafes". This migration installs the `unaccent`
-- extension and folds accents to their ASCII base BEFORE the alphanumeric
-- collapse, so diacritics survive as letters.
--
-- Idempotent: extension via IF NOT EXISTS; slugify() via create-or-replace.
-- The uniqueness suffix, assign trigger, backfill, and NOT NULL/unique index
-- from 0008 are unchanged and keep working — only the base-slug derivation is
-- refined here.
--
-- NOTE on volatility: extensions.unaccent() is STABLE (it reads the unaccent
-- dictionary), so slugify() can no longer be IMMUTABLE and is redeclared STABLE.
-- Safe: no index or generated column depends on slugify() — the unique index in
-- 0008 is on the plain `slug` column, not on slugify(name). The assign trigger
-- calls slugify() at write time, where STABLE is sufficient.

-- ── unaccent extension (Supabase installs extensions into the `extensions`
-- schema; pgcrypto/uuid-ossp already live there). ──────────────────────────
create extension if not exists unaccent with schema extensions;

-- ── slugify, now accent-aware ──────────────────────────────────────────────
-- Pipeline: unaccent (fold diacritics to ASCII) → lower → collapse any run of
-- non-alphanumerics to a single hyphen → trim hyphens → fall back to
-- 'collection' when nothing slug-able remains. The dictionary is pinned
-- explicitly ('unaccent') so resolution never depends on the caller's
-- search_path.
create or replace function public.slugify(input text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(
      trim(both '-' from
        regexp_replace(
          lower(extensions.unaccent('unaccent', coalesce(input, ''))),
          '[^a-z0-9]+', '-', 'g'
        )
      ),
      ''
    ),
    'collection'  -- fallback when the name has no slug-able characters
  );
$$;
