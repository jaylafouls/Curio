-- 0012 — Fix saves_count never incrementing (RLS blocked the counter trigger).
--
-- The saves_count denormalization trigger on user_links (0004) runs its
-- `update public.links set saves_count = ...` in the security context of the
-- statement that inserted the user_link — i.e. the AUTHENTICATED end user's
-- session. But `links` has NO update policy for clients by design (0005: the
-- canonical title/description/image/saves_count are the monetisable cross-user
-- record and must never be client-writable). So under RLS the trigger's UPDATE
-- matched ZERO rows and saves_count silently stayed at 0 — the "X people saved
-- this" signal never moved. This surfaced in chantier 11, the first code path to
-- ever insert user_links against a canonical Link.
--
-- Fix: run the counter function as SECURITY DEFINER (owner rights, bypassing
-- RLS) exactly like the other trusted trigger functions in 0004
-- (create_default_plan_for_user). The function only ever touches
-- links.saves_count on the specific link_id of the row being saved/unsaved, so
-- widening its rights to the counter update is safe and intentional — it is
-- trusted server logic, not a client write. search_path is pinned to public per
-- the definer-function convention.
--
-- Idempotent: create-or-replace of the function; the existing trigger already
-- references it by name, so no trigger change is needed. A one-time backfill
-- reconciles saves_count with the real user_links head-count for any rows saved
-- before this fix (e.g. the verification saves).

create or replace function public.bump_link_saves_count()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Backfill: set every link's saves_count to its true user_links head-count, so
-- rows saved while the trigger was inert are corrected. Safe to re-run.
update public.links l
set saves_count = coalesce(c.n, 0)
from (
  select link_id, count(*)::int as n
  from public.user_links
  group by link_id
) c
where c.link_id = l.id
  and l.saves_count is distinct from c.n;

-- Links with zero saves that somehow hold a stale positive count get corrected too.
update public.links l
set saves_count = 0
where l.saves_count <> 0
  and not exists (select 1 from public.user_links ul where ul.link_id = l.id);
