-- 0006 — Auth wiring (chantier Auth, Phase 1 4/7).
-- Two concerns, both required before the app auth flow can function:
--
--  (A) Provision a public.users profile row when a Supabase auth.users row is
--      created (Google / Apple / Email magic link). Nothing else creates this
--      row, and public.users.username / display_name are NOT NULL, so we mint a
--      PROVISIONAL username (user_<8hex>, valid vs the ^[a-z0-9_]{3,20}$ check)
--      that the Onboarding chantier (5/7) will let the user replace. The
--      existing trg_users_default_plan (0004) then fires to create the 'free'
--      plan. onboarding_completed defaults false, so the callback routes new
--      users into onboarding.
--
--  (B) redeem_invitation_token(token, user_id): the founding-curator promotion
--      the brief scopes as "UNE SEULE transaction" (§4). A single SECURITY
--      DEFINER function flips the token to 'used', stamps used_by/used_at, sets
--      users.is_founding_curator = true, and upgrades the plan to
--      'founding_curator' — all-or-nothing. SECURITY DEFINER because
--      invitation_tokens is a deny-all-to-clients table (0005: RLS on, no
--      policy), so only a definer function can touch it from an app session.
--
-- Idempotent: functions via create-or-replace; trigger dropped-then-created.

-- ── (A) auth.users → public.users provisioning ────────────────────────────
-- SECURITY DEFINER so it can insert into public.users regardless of the
-- inserting role. search_path pinned to public (defence against search_path
-- hijacking on a SECURITY DEFINER function).
--
-- username: 'user_' + first 8 hex chars of the new uuid. The uuid is unique, so
-- an 8-hex prefix collision is astronomically unlikely; on the off chance one
-- occurs the unique constraint raises and signup fails loudly rather than
-- silently corrupting — acceptable for a provisional handle replaced at
-- onboarding. Length 'user_' (5) + 8 = 13, within the 3-20 bound.
--
-- display_name: prefer OAuth-provided full name (raw_user_meta_data->>'full_name'
-- or 'name'), else the email local-part, else the provisional username. NOT NULL
-- is thus always satisfied.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provisional_username text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  derived_display_name text;
begin
  derived_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    provisional_username
  );

  insert into public.users (id, username, display_name, onboarding_completed)
  values (new.id, provisional_username, derived_display_name, false)
  on conflict (id) do nothing;  -- idempotent: never clobber an existing profile

  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── (B) redeem_invitation_token — atomic founding-curator promotion ───────
-- Returns true if a valid pending (non-expired) token was consumed for p_user,
-- false if the token was absent/invalid/expired/already-used (caller then keeps
-- the normal Découvreur path — brief §4: no error, silent downgrade).
--
-- Runs entirely in one statement's implicit transaction. The three writes
-- (token, users, plans) commit together or not at all.
create or replace function public.redeem_invitation_token(
  p_token text,
  p_user uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
begin
  if p_token is null or p_token = '' then
    return false;
  end if;

  -- Lock the candidate row so two concurrent redemptions can't both win.
  select id into v_token_id
    from public.invitation_tokens
   where token = p_token
     and status = 'pending'
     and (expires_at is null or expires_at > now())
   for update;

  if v_token_id is null then
    return false;  -- absent / used / expired / revoked → normal Découvreur path
  end if;

  update public.invitation_tokens
     set status  = 'used',
         used_by = p_user,
         used_at = now()
   where id = v_token_id;

  update public.users
     set is_founding_curator = true
   where id = p_user;

  -- The signup trigger already created a 'free' plan; promote it. Upsert guards
  -- the (unlikely) case where the plan row isn't there yet.
  insert into public.plans (user_id, plan_type, status)
  values (p_user, 'founding_curator', 'active')
  on conflict (user_id) do update
     set plan_type = 'founding_curator';

  return true;
end;
$$;

-- Allow authenticated app sessions to call the redeemer (the function itself is
-- SECURITY DEFINER and validates everything internally). Not granted to anon.
revoke all on function public.redeem_invitation_token(text, uuid) from public;
grant execute on function public.redeem_invitation_token(text, uuid) to authenticated;
