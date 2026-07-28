# Project Knowledge

Append-only register of project-specific rules, patterns, and lessons learned.
Agents read this before every unit. Add entries when you discover something worth remembering.
## Rules

| # | Scope | Rule | Why | Added |
|---|-------|------|-----|-------|
| 1 | Supabase / env | The Supabase anon key (a JWT) is the source of truth for the project ref. Decode its payload — the `ref` claim gives the canonical lowercase project ref; the URL is always `https://<ref>.supabase.co`. Never guess or hand-fix a mistyped `NEXT_PUBLIC_SUPABASE_URL` — derive it from the anon JWT. | A mistyped URL (missing `https://`, stray capitalisation) breaks connectivity. The anon key travels with the URL and cannot be typo'd in a way that still validates, so it authoritatively recovers the correct ref. | 2026-07-26 |

## Patterns

| # | Pattern | Where | Notes |
|---|---------|-------|-------|

## Lessons Learned

| # | What Happened | Root Cause | Fix | Scope |
|---|--------------|------------|-----|-------|
| 1 | `npm run db:migrate` failed with `write CONNECT_TIMEOUT aws-0-eu-central-1.pooler.supabase.com:6543` even though the DB was healthy (raw TCP to :6543/:5432 succeeded, and a probe connected in ~25s). | The EU pooler's TLS handshake can cold-start slowly (25s+ observed); the `postgres` driver's default connect timeout is shorter than that, so a healthy connection is aborted mid-handshake. | Set an explicit generous `connect_timeout: 60` on the `postgres()` client in `scripts/db-migrate.mjs`. Retry once on a raw timeout before diagnosing. | Supabase / db-migrate |
| 2 | Verifier check for a function used `pg_get_function_identity_arguments(oid) = 'text, uuid'` and reported FAIL though the function existed. | `pg_get_function_identity_arguments` includes parameter NAMES (`p_token text, p_user uuid`), not bare types. | Match the type list instead: `array(select format_type(unnest(proargtypes), null)) = array['text','uuid']`. | db-migrate verifier |
