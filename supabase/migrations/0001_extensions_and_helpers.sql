-- 0001 — Extensions and shared helper functions
-- Curio schema, Phase 1 "Schéma DB". Source of truth: docs/CURIO_DATA_MODEL_v1_2_5.md.
-- All migrations in this chantier are written to be idempotent (re-runnable).

-- gen_random_uuid() lives in pgcrypto on older PG, and is core on PG13+.
-- Supabase ships it; this guards a fresh/local instance without failing if absent.
create extension if not exists pgcrypto;

-- Generic updated_at maintainer. Attached (0006) to: users, projects, collections,
-- plans, brands, editorial. Sets updated_at to now() on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
