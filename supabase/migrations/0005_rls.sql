-- 0005 — Row Level Security.
-- RLS enabled on EVERY table (no table exposed without a policy decision).
-- Policies implement the visibility matrix from the chantier brief.
-- service_role bypasses RLS entirely — "server-only" tables get RLS ON with no
-- anon/authenticated policy, which denies all client access by default.
--
-- Idempotent: enable is a no-op if already on; each policy dropped-then-created.

-- Enable RLS on all tables ------------------------------------------------------
alter table public.users              enable row level security;
alter table public.topics             enable row level security;
alter table public.user_topics        enable row level security;
alter table public.projects           enable row level security;
alter table public.collections        enable row level security;
alter table public.sections           enable row level security;
alter table public.brands             enable row level security;
alter table public.links              enable row level security;
alter table public.user_links         enable row level security;
alter table public.analytics_events   enable row level security;
alter table public.follows            enable row level security;
alter table public.collection_follows enable row level security;
alter table public.invitation_tokens  enable row level security;
alter table public.plans              enable row level security;
alter table public.notifications      enable row level security;
alter table public.editorial          enable row level security;
alter table public.consent_logs       enable row level security;

-- ── users — public profile read, owner-only write ─────────────────────────
-- RLS is row-level; all columns here are profile fields (no email — that lives
-- in auth.users), so public SELECT on all rows is consistent with the brief's
-- "public profile fields readable".
drop policy if exists users_select_public on public.users;
create policy users_select_public on public.users
  for select using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists users_delete_self on public.users;
create policy users_delete_self on public.users
  for delete using (auth.uid() = id);

-- ── topics — public read reference data, no client write ──────────────────
drop policy if exists topics_select_public on public.topics;
create policy topics_select_public on public.topics
  for select using (true);

-- ── user_topics — owner reads/writes own rows ─────────────────────────────
drop policy if exists user_topics_all_self on public.user_topics;
create policy user_topics_all_self on public.user_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── projects — owner only, never public ───────────────────────────────────
drop policy if exists projects_all_owner on public.projects;
create policy projects_all_owner on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── collections — public if is_public, else owner; write owner-only ───────
drop policy if exists collections_select_public_or_owner on public.collections;
create policy collections_select_public_or_owner on public.collections
  for select using (is_public or auth.uid() = owner_id);

drop policy if exists collections_insert_owner on public.collections;
create policy collections_insert_owner on public.collections
  for insert with check (auth.uid() = owner_id);

drop policy if exists collections_update_owner on public.collections;
create policy collections_update_owner on public.collections
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists collections_delete_owner on public.collections;
create policy collections_delete_owner on public.collections
  for delete using (auth.uid() = owner_id);

-- ── sections — follow parent collection visibility ────────────────────────
-- Readable if the parent collection is readable (public OR owned). Writable
-- only by the collection owner.
drop policy if exists sections_select_via_collection on public.sections;
create policy sections_select_via_collection on public.sections
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = sections.collection_id
        and (c.is_public or c.owner_id = auth.uid())
    )
  );

drop policy if exists sections_write_via_collection_owner on public.sections;
create policy sections_write_via_collection_owner on public.sections
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = sections.collection_id and c.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collections c
      where c.id = sections.collection_id and c.owner_id = auth.uid()
    )
  );

-- ── links — public read; writes server-side only (service_role bypasses RLS)
-- No insert/update/delete policy → clients cannot mutate title/description etc.
drop policy if exists links_select_public on public.links;
create policy links_select_public on public.links
  for select using (true);

-- ── user_links — owner always; readable by third parties only when the row
-- sits in a PUBLIC collection. Never exposes Unsorted/private rows to others.
drop policy if exists user_links_select_owner_or_public_collection on public.user_links;
create policy user_links_select_owner_or_public_collection on public.user_links
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.collections c
      where c.id = user_links.collection_id and c.is_public
    )
  );

drop policy if exists user_links_insert_owner on public.user_links;
create policy user_links_insert_owner on public.user_links
  for insert with check (auth.uid() = user_id);

drop policy if exists user_links_update_owner on public.user_links;
create policy user_links_update_owner on public.user_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_links_delete_owner on public.user_links;
create policy user_links_delete_owner on public.user_links
  for delete using (auth.uid() = user_id);

-- ── follows — reads public (social graph is public), writes by follower ───
-- Brief doesn't restrict follow SELECT; social follows are inherently public
-- (follower/following counts and lists are shown on public profiles).
drop policy if exists follows_select_public on public.follows;
create policy follows_select_public on public.follows
  for select using (true);

drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows
  for delete using (auth.uid() = follower_id);

-- ── collection_follows — reads public, writes by the following user ───────
drop policy if exists collection_follows_select_public on public.collection_follows;
create policy collection_follows_select_public on public.collection_follows
  for select using (true);

drop policy if exists collection_follows_insert_self on public.collection_follows;
create policy collection_follows_insert_self on public.collection_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists collection_follows_delete_self on public.collection_follows;
create policy collection_follows_delete_self on public.collection_follows
  for delete using (auth.uid() = user_id);

-- ── plans — read by the owning user only, no client write ─────────────────
drop policy if exists plans_select_self on public.plans;
create policy plans_select_self on public.plans
  for select using (auth.uid() = user_id);

-- ── notifications — read by recipient, mark-as-read update by recipient ───
drop policy if exists notifications_select_recipient on public.notifications;
create policy notifications_select_recipient on public.notifications
  for select using (auth.uid() = recipient_id);

drop policy if exists notifications_update_recipient on public.notifications;
create policy notifications_update_recipient on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- ── consent_logs — authenticated user INSERTs its own row; no client read ─
-- RGPD: once written, the client cannot read/modify/delete. Only INSERT for
-- self is permitted; audit/retrieval happens server-side (service_role).
drop policy if exists consent_logs_insert_self on public.consent_logs;
create policy consent_logs_insert_self on public.consent_logs
  for insert with check (auth.uid() = user_id);

-- ── Server-only tables: RLS ON, no anon/authenticated policy ──────────────
-- brands, analytics_events, invitation_tokens, editorial: no client access.
-- service_role bypasses RLS, so future server routes still reach them.
-- (No CREATE POLICY here on purpose — RLS-on + no-policy = deny-all to clients.)
