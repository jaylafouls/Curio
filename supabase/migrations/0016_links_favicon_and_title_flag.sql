-- 0016 — links.favicon_url + links.title_is_fallback.
--
-- Two additions for the Add-to-Curio metadata pass (Phase 5, point 1):
--
-- 1. links.favicon_url — the canonical site favicon (absolute http(s) URL),
--    extracted best-effort at OG-fetch time (<link rel="icon"> / shortcut icon /
--    apple-touch-icon, else <origin>/favicon.ico). A new canonical facet on the
--    shared Link, alongside title/description/image_url. Nullable: never blocks a
--    save, empty when the fetch failed or found none.
--
-- 2. links.title_is_fallback — TRUE when the stored `title` is only the readable
--    URL fallback (the OG fetch found no real title: 403, timeout, JS-only shell,
--    non-HTML). This is the fix for "the title stays the URL forever": the
--    canonical title is frozen on first save and never re-fetched, so a first
--    save that degraded froze the URL as the title for every later saver too.
--    The flag lets resolveLink do a SCOPED conditional re-fetch — only on a
--    dedup hit whose title is flagged degraded — and upgrade the row in place if
--    a real title now resolves. Healthy rows (flag false) are never re-fetched.
--
-- Idempotent: both columns via ADD COLUMN IF NOT EXISTS. No backfill — prod holds
-- no real canonical links yet (same posture as 0008/0015), and existing rows
-- default to favicon_url NULL / title_is_fallback FALSE, which is safe: a false
-- flag simply means "trusted title, don't re-fetch", the pre-existing behaviour.

alter table public.links
  add column if not exists favicon_url text;

alter table public.links
  add column if not exists title_is_fallback boolean not null default false;
