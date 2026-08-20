-- 0017 — full-text-ish search + keyset pagination for /saved (saved-inbox-search).
--
-- WHAT & WHY
-- /saved graduates from "fetch newest 60, filter in memory" to a server-driven,
-- paginated, searchable inbox. The search runs over BOTH sides of the save:
--   • user_links.title_override  — the saver's personal title override
--   • user_links.tags            — the saver's free text[] tags
--   • links.title / links.description — the canonical (shared) metadata
--   • user_links.url_origin      — matched in the query, no index needed (cheap)
-- There is NO denormalised search column on user_links: copying links.title down
-- would go stale the moment the favicon branch's conditional title re-fetch
-- (0016 title_is_fallback) upgrades a canonical title in place. We JOIN instead
-- and index each side (decision: freshness over denormalisation).
--
-- INDEXES
--   • pg_trgm GIN on the four text columns → accelerates ILIKE '%q%' substring
--     search (the trailing/leading wildcard a prefix b-tree cannot serve). The
--     query folds accents with unaccent() at match time for é≈e; we index the
--     RAW columns (not unaccent(col)) because unaccent() is STABLE, not
--     IMMUTABLE (see 0009) and Postgres forbids a functional index on a
--     non-IMMUTABLE expression. trgm on the raw column still prunes the ILIKE
--     candidate set; the unaccent fold is applied in the WHERE recheck.
--   • GIN on user_links.tags (text[] default ops) → membership/overlap for the
--     tags filter.
--   • Keyset composite (user_id, saved_at desc, id desc) → the pagination path.
--     Every page is `where user_id = $1 [and (saved_at,id) < (cursor)] order by
--     saved_at desc, id desc limit n+1`. No OFFSET: cost stays flat at page N.
--     id desc is the tiebreaker so saves sharing a saved_at paginate stably.
--
-- unaccent is already installed by 0009 (into the `extensions` schema). pg_trgm
-- installs here, same posture (extensions schema, IF NOT EXISTS).
--
-- Idempotent: extension IF NOT EXISTS; every index IF NOT EXISTS. No backfill —
-- indexes cover existing rows automatically; prod holds no real canonical links
-- yet (same posture as 0008/0015/0016).

-- ── 1. pg_trgm — trigram similarity, for ILIKE substring acceleration ────────
create extension if not exists pg_trgm with schema extensions;

-- ── 2. Trigram GIN indexes on the four searchable text columns ───────────────
-- user_links side (personal): the override title + the origin URL. gin_trgm_ops
-- lives in the extensions schema alongside the extension.
create index if not exists idx_user_links_title_override_trgm
  on public.user_links using gin (title_override extensions.gin_trgm_ops);

-- links side (canonical, shared): title + description. Fresh at read time — the
-- join reads whatever the canonical row currently holds, so a re-fetched title
-- (0016) is searchable immediately with no reindex of user_links.
create index if not exists idx_links_title_trgm
  on public.links using gin (title extensions.gin_trgm_ops);
create index if not exists idx_links_description_trgm
  on public.links using gin (description extensions.gin_trgm_ops);

-- ── 3. GIN on the tags array (membership / overlap for the tags filter) ──────
create index if not exists idx_user_links_tags
  on public.user_links using gin (tags);

-- ── 4. Keyset pagination index — (user_id, saved_at desc, id desc) ───────────
-- Serves the ordered page walk directly: user_id equality prefix, then the
-- (saved_at desc, id desc) sort/seek. Replaces reliance on idx_user_links_user
-- (0002) for the /saved read path; that index stays for other user_id lookups.
create index if not exists idx_user_links_user_saved_keyset
  on public.user_links (user_id, saved_at desc, id desc);

-- ── 5. Search RPC — search_saved_links(...) ──────────────────────────────────
-- Why an RPC and not a PostgREST query: the search spans an embedded resource
-- (links.title/description) with an OR across four columns, needs a compound
-- keyset seek on (saved_at, id) with an id-desc tiebreak, and unaccent-folds
-- both sides at match time. PostgREST's .or() across an embedded table plus a
-- cross-column tuple keyset is awkward and fragile through the JS client; one
-- SQL function is clearer, correct, and index-friendly.
--
-- SECURITY INVOKER (the default — stated explicitly for auditability): the
-- function runs under the CALLER's RLS. The owner-only user_links SELECT policy
-- (0005) already scopes every row to auth.uid(), so no DEFINER bypass is needed
-- or wanted — this is an ordinary owner read, same posture as the old
-- getSavedLinks. links SELECT is public, so the join reads canonical metadata
-- freely. p_user_id is passed for clarity but the RLS predicate is the real gate.
--
-- Params (all filters nullable = "no filter"):
--   p_user_id       the caller (redundant with auth.uid() under RLS; kept explicit)
--   p_q             search text; unaccent+lower folded, matched as substring
--   p_scope         'all' | 'inbox' | 'collection'
--                     inbox      → collection_id IS NULL (Unsorted)
--                     collection → collection_id = p_collection_id
--                     all        → no collection constraint
--   p_topic_id      topic filter
--   p_subcategory_id sub-category filter
--   p_collection_id collection filter (required semantics when scope='collection')
--   p_tags          text[] — rows whose tags OVERLAP any of these (&&)
--   p_cursor_saved_at / p_cursor_id  keyset cursor (exclusive); NULL = first page
--   p_limit         page size (caller passes limit+1 to detect "has more")
--
-- Returns user_links rows joined to canonical link metadata + sub-category label,
-- newest first, stable by (saved_at desc, id desc).
create or replace function public.search_saved_links(
  p_user_id uuid,
  p_q text default null,
  p_scope text default 'all',
  p_topic_id text default null,
  p_subcategory_id uuid default null,
  p_collection_id uuid default null,
  p_tags text[] default null,
  p_cursor_saved_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 30
)
returns table (
  id uuid,
  title_override text,
  custom_image_url text,
  url_origin text,
  collection_id uuid,
  saved_at timestamptz,
  topic_id text,
  subcategory_id uuid,
  tags text[],
  link_title text,
  link_description text,
  link_image_url text,
  subcategory_label text
)
language sql
stable
as $$
  select
    ul.id,
    ul.title_override,
    ul.custom_image_url,
    ul.url_origin,
    ul.collection_id,
    ul.saved_at,
    ul.topic_id,
    ul.subcategory_id,
    ul.tags,
    l.title        as link_title,
    l.description  as link_description,
    l.image_url    as link_image_url,
    sc.label       as subcategory_label
  from public.user_links ul
  join public.links l on l.id = ul.link_id
  left join public.link_subcategories sc on sc.id = ul.subcategory_id
  where ul.user_id = p_user_id
    -- scope
    and (
      p_scope = 'all'
      or (p_scope = 'inbox' and ul.collection_id is null)
      or (p_scope = 'collection' and ul.collection_id = p_collection_id)
    )
    -- structured filters (each NULL = skip)
    and (p_topic_id is null or ul.topic_id = p_topic_id)
    and (p_subcategory_id is null or ul.subcategory_id = p_subcategory_id)
    and (p_collection_id is null or ul.collection_id = p_collection_id)
    and (p_tags is null or ul.tags && p_tags)
    -- free-text search over both sides, unaccent+lower folded
    and (
      p_q is null
      or p_q = ''
      or extensions.unaccent(lower(coalesce(ul.title_override, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(l.title, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(l.description, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(ul.url_origin, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or exists (
        select 1 from unnest(coalesce(ul.tags, '{}'::text[])) tag
        where extensions.unaccent(lower(tag)) like '%' || extensions.unaccent(lower(p_q)) || '%'
      )
    )
    -- keyset seek: strictly after the cursor in (saved_at desc, id desc) order
    and (
      p_cursor_saved_at is null
      or ul.saved_at < p_cursor_saved_at
      or (ul.saved_at = p_cursor_saved_at and ul.id < p_cursor_id)
    )
  order by ul.saved_at desc, ul.id desc
  limit greatest(p_limit, 1);
$$;

-- ── 6. Scope counts RPC — saved_links_counts(...) ────────────────────────────
-- The scope tabs (Inbox / All) show live counts that must reflect the SAME
-- text + structured filters as the list (a search narrows every tab, not just
-- the active one). Computed server-side in one pass so the client never counts
-- an in-memory slice (which no longer exists — the list is paginated).
--
-- Returns a single row: total (scope='all' semantics, i.e. every save matching
-- the text+structured filters) and inbox (that set restricted to collection_id
-- IS NULL). The client derives the "collection" tab counts from its own
-- collection list when needed; those two are the always-present tabs.
create or replace function public.saved_links_counts(
  p_user_id uuid,
  p_q text default null,
  p_topic_id text default null,
  p_subcategory_id uuid default null,
  p_tags text[] default null
)
returns table (
  total bigint,
  inbox bigint
)
language sql
stable
as $$
  select
    count(*)::bigint as total,
    count(*) filter (where ul.collection_id is null)::bigint as inbox
  from public.user_links ul
  join public.links l on l.id = ul.link_id
  where ul.user_id = p_user_id
    and (p_topic_id is null or ul.topic_id = p_topic_id)
    and (p_subcategory_id is null or ul.subcategory_id = p_subcategory_id)
    and (p_tags is null or ul.tags && p_tags)
    and (
      p_q is null
      or p_q = ''
      or extensions.unaccent(lower(coalesce(ul.title_override, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(l.title, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(l.description, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or extensions.unaccent(lower(coalesce(ul.url_origin, ''))) like '%' || extensions.unaccent(lower(p_q)) || '%'
      or exists (
        select 1 from unnest(coalesce(ul.tags, '{}'::text[])) tag
        where extensions.unaccent(lower(tag)) like '%' || extensions.unaccent(lower(p_q)) || '%'
      )
    );
$$;

-- Execute grants: authenticated (the app) + service_role. The blanket grants in
-- 0007 already cover future functions to service_role via ALL, but be explicit
-- for the API roles that actually call these via .rpc() (same posture as 0006's
-- explicit redeemer grant).
grant execute on function public.search_saved_links(
  uuid, text, text, text, uuid, uuid, text[], timestamptz, uuid, int
) to authenticated, service_role;
grant execute on function public.saved_links_counts(
  uuid, text, text, uuid, text[]
) to authenticated, service_role;
