-- 0014 — Dedicated auth tokens for the Chrome extension (Phase 5, chantier 5).
--
-- The extension runs on a chrome-extension:// origin and CANNOT use the web
-- session cookie (Decisions Log §17: no cross-origin cookie sharing). Instead it
-- carries a dedicated bearer token, minted from an authenticated web session
-- (issued in /settings) and sent as `Authorization: Bearer <token>` on the
-- /api/extension/* routes.
--
-- SECURITY MODEL — mirrors invitation_tokens (server-only, deny-all):
--   • The raw token is NEVER stored. We store only its SHA-256 hash; the raw
--     value is shown to the user exactly once at mint time and lives only in the
--     extension's chrome.storage.local afterward.
--   • RLS enabled with NO anon/authenticated policy → deny-all to the browser.
--     Only the service-role client (server-only lib/supabase/admin.ts) reaches
--     this table: the mint Server Action and the route token verifier.
--   • Grants: the blanket service_role / anon grants from 0007 (incl. ALTER
--     DEFAULT PRIVILEGES for future tables) already cover this table, so the
--     service-role can DML it while anon/authenticated stay gated by RLS.
--
-- Lifecycle columns support revocation (revoked_at), expiry (expires_at), and a
-- best-effort last-used stamp for the user to recognise/prune tokens later.
--
-- Idempotent: create table if not exists; policies are dropped-then-(not)created
-- (no policy = deny-all, so there is nothing to create — we only ensure RLS on).

create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- SHA-256 hex of the raw token (64 chars). Never the raw token.
  token_hash text not null unique,
  -- User-facing label so a user can tell tokens apart (e.g. "Chrome — laptop").
  label text,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Verifier looks up by hash on every request; keep it indexed. The UNIQUE above
-- already creates an index on token_hash, so no extra index is needed.

-- Active-token lookups per user (the /settings list, revocation) filter by user.
create index if not exists idx_extension_tokens_user
  on public.extension_tokens (user_id);

-- Server-only: RLS on, no anon/authenticated policy → deny-all to the browser.
-- service_role bypasses RLS entirely (same pattern as invitation_tokens, 0005).
alter table public.extension_tokens enable row level security;
