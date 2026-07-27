-- 0002 — Tables (16 + user_topics join), in FK-dependency order.
-- Every column, type, constraint transcribed from docs/CURIO_DATA_MODEL_v1_2_5.md.
-- Idempotent via "create table if not exists" — safe to re-run.

-- ── 1. users — extends auth.users ─────────────────────────────────────────
-- §2. No email column (duplicated from auth.users). No soft-delete.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),                    -- lowercase/digits/underscore, 3-20
  display_name text not null,
  avatar_url text,
  bio text check (char_length(bio) <= 160),                    -- ~160 chars
  location text,
  website_url text,
  universe_name text check (char_length(universe_name) between 1 and 20),
  universe_color text check (universe_color in ('violet','beige','vert','bleu','rose')),
  language text not null default 'en' check (language in ('en','fr')),
  theme_preference text not null default 'light' check (theme_preference in ('light','dark')),
  is_founding_curator boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. topics — 10 Core + 3 Extended (seed in 0003) ───────────────────────
-- §3. id is a stable english slug (text PK), not a uuid.
create table if not exists public.topics (
  id text primary key,                                         -- slug: 'travel', 'style'...
  label_en text not null,
  label_fr text not null,
  icon text not null,
  display_order integer not null unique,
  is_core boolean not null default true,
  is_active boolean not null default true,
  badge_color text                                             -- nullable; seeded from tailwind palette
);

-- ── 3. user_topics — join User↔Topic ──────────────────────────────────────
-- §4. Composite PK (user_id, topic_id).
create table if not exists public.user_topics (
  user_id uuid not null references public.users (id) on delete cascade,
  topic_id text not null references public.topics (id),
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- ── 4. projects — private container, never public ─────────────────────────
-- §5. No is_public, no topic_id. Links are never placed directly in a Project
-- (enforced by the *absence* of any links→projects FK, not a constraint here).
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 5. collections — central social object ────────────────────────────────
-- §6. project_id on delete set null (deleting a Project never deletes its
-- Collections). links_count / followers_count are intentionally NOT columns
-- (§6 decision): counted on demand, no denormalized column, no trigger.
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,   -- NULL = standalone
  topic_id text not null references public.topics (id),
  name text not null,
  description text,
  note text check (char_length(note) <= 500),                  -- private, never public
  cover_image_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 6. sections — internal subgroup of a Collection, never standalone ──────
-- §7. "order" is a reserved word → always quoted.
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── 7. brands — advertiser account, minimal model (needed before links FK) ─
-- §10. No FK to users. Created before links because links.brand_id references it.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  status text not null default 'pending' check (status in ('pending','active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 8. links — canonical object, owned by no one ──────────────────────────
-- §8. No owner_id. title frozen after first save (app-enforced). Counters
-- denormalized via triggers (0006); forks_count present but unused in V1.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  url_normalized text not null unique,
  url_first_origin text not null,
  title text not null check (char_length(title) <= 100),
  description text check (char_length(description) <= 300),
  image_url text,
  latitude numeric,
  longitude numeric,
  address text,
  saves_count integer not null default 0,
  clicks_count integer not null default 0,
  forks_count integer not null default 0,                      -- present but not exploited in V1
  status text not null default 'active' check (status in ('active','unavailable')),
  last_checked_at timestamptz,
  is_sponsored boolean not null default false,
  brand_id uuid references public.brands (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── 9. user_links — personal User↔Link relation (densest table) ───────────
-- §9. unique(user_id, link_id, collection_id, section_id). section_id must
-- belong to collection_id — enforced by a BEFORE trigger (0006), not FK.
create table if not exists public.user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  link_id uuid not null references public.links (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,   -- NULL = Unsorted
  section_id uuid references public.sections (id) on delete set null,         -- NULL = Unsectioned
  title_override text check (char_length(title_override) <= 100),
  custom_image_url text,
  note text check (char_length(note) <= 500),                  -- private
  tags text[],
  category text,                                               -- distinct from tags, personal
  url_origin text not null,
  saved_at timestamptz not null default now(),
  unique (user_id, link_id, collection_id, section_id)
);

-- ── 10. analytics_events — append-only raw event log ──────────────────────
-- §11. user_id set null (RGPD: events survive account deletion, anonymized).
-- brand_id denormalized from links.brand_id for aggregation without a join.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  link_id uuid not null references public.links (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  event_type text not null check (event_type in ('impression','click')),
  created_at timestamptz not null default now()
);

-- ── 11. follows — User → User ─────────────────────────────────────────────
-- §12. No self-follow, no duplicate.
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users (id) on delete cascade,
  followed_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id <> followed_id)
);

-- ── 12. collection_follows — User → Collection ────────────────────────────
-- §13. No project_follows (Projects are always private).
create table if not exists public.collection_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, collection_id)
);

-- ── 13. invitation_tokens — Founding Curator invites ──────────────────────
-- §14. Token consumption sets users.is_founding_curator=true in the same
-- app transaction (Auth chantier) — not a DB constraint here.
create table if not exists public.invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid references public.users (id) on delete set null,
  email text,
  status text not null default 'pending'
    check (status in ('pending','used','expired','revoked')),
  used_by uuid references public.users (id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── 14. plans — commercial plan, 1-1 with user ────────────────────────────
-- §15. user_id unique (1-1). Auto-created on signup by trigger (0006) as 'free'.
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  plan_type text not null
    check (plan_type in ('free','founding_curator','first_year_curator','pro','brand')),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 15. notifications — social activity ───────────────────────────────────
-- §16. target_id is a polymorphic reference — no real FK. 'comment' type is
-- present in the check per doc, though no comment system is specified yet.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid references public.users (id) on delete set null,
  type text not null check (type in ('follow','like','comment','mention')),
  target_type text check (target_type in ('user','collection','link')),
  target_id uuid,                                              -- polymorphic, no FK
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── 16. editorial — Curio team content ────────────────────────────────────
-- §17. author_name is free text (no FK to users).
create table if not exists public.editorial (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  type text not null check (type in ('guide','essay','interview','collection')),
  body text not null,
  cover_image_url text,
  topic_id text references public.topics (id),
  language text not null check (language in ('en','fr')),
  author_name text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 17. consent_logs — RGPD consent journal ───────────────────────────────
-- §18. CRITICAL: user_id on delete SET NULL (not cascade) — proof of consent
-- must survive account deletion.
create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  consent_type text not null check (consent_type in ('necessary','analytics','marketing')),
  given boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

-- ── Indexes on hot FK / lookup paths (non-unique; uniques already indexed) ─
create index if not exists idx_user_topics_topic       on public.user_topics (topic_id);
create index if not exists idx_projects_owner          on public.projects (owner_id);
create index if not exists idx_collections_owner       on public.collections (owner_id);
create index if not exists idx_collections_project     on public.collections (project_id);
create index if not exists idx_collections_topic       on public.collections (topic_id);
create index if not exists idx_sections_collection     on public.sections (collection_id);
create index if not exists idx_links_brand             on public.links (brand_id);
create index if not exists idx_user_links_user         on public.user_links (user_id);
create index if not exists idx_user_links_link         on public.user_links (link_id);
create index if not exists idx_user_links_collection   on public.user_links (collection_id);
create index if not exists idx_user_links_section      on public.user_links (section_id);
create index if not exists idx_analytics_link          on public.analytics_events (link_id);
create index if not exists idx_analytics_brand         on public.analytics_events (brand_id);
create index if not exists idx_analytics_user          on public.analytics_events (user_id);
create index if not exists idx_follows_followed        on public.follows (followed_id);
create index if not exists idx_collection_follows_coll on public.collection_follows (collection_id);
create index if not exists idx_notifications_recipient on public.notifications (recipient_id);
create index if not exists idx_editorial_topic         on public.editorial (topic_id);
create index if not exists idx_consent_logs_user       on public.consent_logs (user_id);
