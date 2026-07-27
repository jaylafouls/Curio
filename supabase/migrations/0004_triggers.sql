-- 0004 — Triggers.
-- Idempotent: functions via create-or-replace; triggers dropped-then-created.

-- ── updated_at auto on: users, projects, collections, plans, brands, editorial
-- Uses the generic public.set_updated_at() from 0001.
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_collections_updated_at on public.collections;
create trigger trg_collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_brands_updated_at on public.brands;
create trigger trg_brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

drop trigger if exists trg_editorial_updated_at on public.editorial;
create trigger trg_editorial_updated_at before update on public.editorial
  for each row execute function public.set_updated_at();

-- ── saves_count denormalization on links, driven by user_links INSERT/DELETE.
-- Each user_link row is one "save" of a canonical link. Counter kept >= 0.
-- NOTE (signalled to owner): clicks_count is NOT maintained here. A "click" is
-- not a user_links event — it originates from analytics_events(event_type=
-- 'click'). The brief scoped this trigger to "saves_count/clicks_count depuis
-- user_links (INSERT/DELETE)", but user_links carries no click signal, so only
-- saves_count has a correct source. clicks_count stays at its default 0 until a
-- click-event source is wired (out of scope for this chantier). forks_count
-- likewise stays 0 (unused in V1, per §8).
create or replace function public.bump_link_saves_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.links set saves_count = saves_count + 1 where id = new.link_id;
  elsif tg_op = 'DELETE' then
    update public.links set saves_count = greatest(saves_count - 1, 0) where id = old.link_id;
  end if;
  return null;  -- AFTER trigger, return value ignored
end;
$$;

drop trigger if exists trg_user_links_saves_count on public.user_links;
create trigger trg_user_links_saves_count
  after insert or delete on public.user_links
  for each row execute function public.bump_link_saves_count();

-- ── section_id ↔ collection_id coherence on user_links (BEFORE INSERT/UPDATE).
-- Postgres can't express "the section must belong to the same collection" via a
-- simple FK, so we enforce it here (§9). Rules:
--   • section_id NULL          → always allowed (Unsectioned).
--   • section_id set, coll NULL → rejected (a section implies its collection).
--   • section_id set + coll set → the section's collection_id must equal ours.
create or replace function public.check_user_link_section_matches_collection()
returns trigger
language plpgsql
as $$
declare
  section_collection uuid;
begin
  if new.section_id is null then
    return new;
  end if;

  select collection_id into section_collection
    from public.sections where id = new.section_id;

  if section_collection is null then
    -- section_id references a non-existent section (FK would also catch this)
    raise exception 'user_links.section_id % does not exist', new.section_id;
  end if;

  if new.collection_id is null then
    raise exception
      'user_links has section_id % but no collection_id (a section requires its collection)',
      new.section_id;
  end if;

  if new.collection_id <> section_collection then
    raise exception
      'user_links.section_id % belongs to collection % but collection_id is %',
      new.section_id, section_collection, new.collection_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_links_section_coherence on public.user_links;
create trigger trg_user_links_section_coherence
  before insert or update on public.user_links
  for each row execute function public.check_user_link_section_matches_collection();

-- ── Signup: auto-create a plans row when a users row is created.
-- Decision (confirmed with owner): always create plan_type='free'. Promotion to
-- 'founding_curator' (+ users.is_founding_curator=true) happens in the app
-- transaction that consumes a valid invitation_token (Auth chantier), NOT here —
-- the invitation link is not known at users INSERT time and is not modelled as a
-- column on users. on conflict keeps this safe if a plan already exists.
create or replace function public.create_default_plan_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plans (user_id, plan_type, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_users_default_plan on public.users;
create trigger trg_users_default_plan
  after insert on public.users
  for each row execute function public.create_default_plan_for_user();
