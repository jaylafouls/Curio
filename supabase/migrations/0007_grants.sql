-- 0007 — Role privileges for the Supabase API roles (anon / authenticated /
-- service_role) on our migration-created public tables.
--
-- WHY THIS IS NEEDED
-- Supabase pre-creates anon/authenticated/service_role and, in a fresh project,
-- grants them table privileges via ALTER DEFAULT PRIVILEGES. But those defaults
-- only apply to objects created *afterwards by the targeted role*. Our tables
-- were created by migrations running as the postgres owner, so they never
-- received those grants. Result observed in the Auth chantier: service_role got
-- only REFERENCES,TRIGGER,TRUNCATE and a plain SELECT on invitation_tokens
-- failed with "permission denied for table" (42501) — even though service_role
-- is supposed to reach server-only tables.
--
-- RLS is a SEPARATE layer from GRANTs: service_role bypasses RLS *policies* but
-- still needs table-level DML grants. anon/authenticated need the SQL privilege
-- to even reach RLS (deny-all server-only tables stay locked by RLS having no
-- policy — the grant just lets the request get as far as the policy check).
--
-- This mirrors how Supabase itself provisions public: broad DML to the API
-- roles, with RLS doing the real authorization. Idempotent (GRANT is a no-op if
-- already held); scoped to existing + future tables/sequences in public.

-- service_role: full DML on every current + future table (RLS-bypassing role,
-- used only server-side for privileged operations like invitation-token reads).
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

-- anon + authenticated: DML privilege so their requests reach the RLS layer.
-- RLS policies (0005) remain the actual gate — server-only tables have no
-- policy and therefore stay deny-all to these roles regardless of this grant.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- Allow the API roles to execute the SECURITY DEFINER redeemer explicitly
-- (0006 already granted authenticated; service_role inherits via the ALL grant
-- above, but be explicit for auditability).
grant execute on function public.redeem_invitation_token(text, uuid)
  to authenticated, service_role;
