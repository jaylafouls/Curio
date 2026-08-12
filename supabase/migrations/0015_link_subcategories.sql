-- 0015 — Link categorisation by Topic + optional sub-category (Decisions Log §18).
--
-- WHAT & WHY
-- A user can now tag each personal save (user_links) with a Topic and, where the
-- Topic defines them, a sub-category — so /saved can be filtered by Topic and
-- sub-category independently of which Collection the link is filed in. Two levels:
--   • Topic       — FK to the existing topics table (reuses badge colours). The
--                    principal level; stored on user_links directly so it can be
--                    set ALONE (the 8 Topics without sub-categories, and any
--                    Unsorted save where a Topic is mandatory).
--   • sub-category — an optional refinement, only where it's genuinely useful.
--                    Modelled as a dedicated reference table (link_subcategories),
--                    NOT a hard CHECK: adding a sub-category to a Topic (or
--                    equipping a new Topic later) is one INSERTed row, never a
--                    schema migration (§18.3, project non-negotiable).
--
-- MODEL (confirmed with owner — "Model B"):
--   user_links carries BOTH topic_id and subcategory_id (nullable). The old
--   user_links.category column (0002 L137, never wired to any UI or action) is
--   DROPPED and replaced by these two. Coherence (subcategory.topic_id ===
--   topic_id) is validated in the app before insert — NO DB trigger — keeping the
--   table extensible: a new sub-category/Topic is always just a row.
--
-- V1 SUB-CATEGORIES (only 2 Topics of 10, no over-engineering — §18.2):
--   Travel : Hébergement / Restaurant / Lieu à voir / Activité / Transport / Autre
--   Food   : Restaurant / Recette / Bar-Café / Produit / Autre
--   The 8 other Topics get NO rows (usages homogeneous enough — §18.2). "Autre"
--   is always last (highest sort_order in each list) — the escape valve that lets
--   the sub-category be mandatory without ever blocking a save.
--
-- NO categorisation becomes canonical on `links` — it stays strictly personal per
-- user_link (only title/description/image are frozen at the canonical level, §18.5).
--
-- GRANTS: the blanket anon/authenticated/service_role grants from 0007 (incl.
-- ALTER DEFAULT PRIVILEGES for future tables) already cover this new table, so no
-- grant statements are needed here (same as 0014's extension_tokens).
--
-- Idempotent: create table if not exists; column adds guarded by IF NOT EXISTS;
-- column drop guarded by IF EXISTS; seed upserts on a stable (topic_id,label) key;
-- RLS enable is a no-op if already on; policy dropped-then-created.

-- ── 1. link_subcategories — reference table (like topics: public read only) ──
create table if not exists public.link_subcategories (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.topics (id),
  label text not null,
  sort_order integer not null default 0,
  -- One label per Topic is unique so the seed can upsert idempotently and a
  -- (Topic, label) pair never duplicates. NOT a CHECK on the value set — the
  -- vocabulary stays open (add a row to extend it), only duplicates are barred.
  unique (topic_id, label)
);

create index if not exists idx_link_subcategories_topic
  on public.link_subcategories (topic_id);

-- ── 2. user_links: add topic_id + subcategory_id, drop the unused `category` ──
-- Both nullable: a save can carry no Topic (legacy/extension saves), a Topic
-- alone (8 Topics without sub-categories, or Unsorted), or Topic + sub-category.
alter table public.user_links
  add column if not exists topic_id text references public.topics (id);

alter table public.user_links
  add column if not exists subcategory_id uuid references public.link_subcategories (id);

-- `category` (0002 L137) was declared but never wired to any UI/action/query.
-- Prod holds zero categorised rows, so there is nothing to back-fill — drop it
-- outright, replaced by the FK columns above (§18.3 "réinterprété comme
-- subcategory_id"). IF EXISTS keeps the migration re-runnable.
alter table public.user_links
  drop column if exists category;

-- Index the new FK lookup paths used by the /saved Topic/sub-category filter.
create index if not exists idx_user_links_topic
  on public.user_links (topic_id);
create index if not exists idx_user_links_subcategory
  on public.user_links (subcategory_id);

-- ── 3. RLS — public read reference data, no client write (mirrors topics) ────
alter table public.link_subcategories enable row level security;

drop policy if exists link_subcategories_select_public on public.link_subcategories;
create policy link_subcategories_select_public on public.link_subcategories
  for select using (true);

-- ── 4. Seed — Travel (6) + Food (5). "Autre" last in each. 8 others: no rows. ─
-- sort_order is explicit and gap-free per Topic; "Autre" carries the highest
-- value so it always sorts last regardless of label collation.
insert into public.link_subcategories (topic_id, label, sort_order) values
  -- Travel
  ('travel', 'Hébergement',   1),
  ('travel', 'Restaurant',    2),
  ('travel', 'Lieu à voir',   3),
  ('travel', 'Activité',      4),
  ('travel', 'Transport',     5),
  ('travel', 'Autre',         6),
  -- Food
  ('food',   'Restaurant',    1),
  ('food',   'Recette',       2),
  ('food',   'Bar-Café',      3),
  ('food',   'Produit',       4),
  ('food',   'Autre',         5)
on conflict (topic_id, label) do update set
  sort_order = excluded.sort_order;
