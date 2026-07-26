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
