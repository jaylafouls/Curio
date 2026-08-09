#!/usr/bin/env node
/**
 * Curio DB migrate + verify — applies supabase/migrations/*.sql to the real
 * EU-Frankfurt Supabase project over the pooler, then runs a verification pass.
 *
 * No supabase CLI / psql on this machine, so we drive Postgres directly with the
 * `postgres` driver. Connection details:
 *   - project ref is decoded from the anon JWT (KNOWLEDGE rule #1 — the ref is
 *     the source of truth, never hand-typed).
 *   - region pinned to eu-central-1 (RGPD non-negotiable) → pooler host
 *     aws-0-eu-central-1.pooler.supabase.com, user postgres.<ref>.
 *   - password from SUPABASE_DB_PASSWORD (collected via secure_env_collect).
 *
 * Idempotent: a _curio_migrations ledger records applied files; re-running skips
 * them. Each file runs inside its own transaction (rolled back on error).
 *
 * Usage:
 *   node scripts/db-migrate.mjs           # apply pending, then verify
 *   node scripts/db-migrate.mjs --verify  # verify only, apply nothing
 */
import postgres from 'postgres'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const VERIFY_ONLY = process.argv.includes('--verify')

// ── env ───────────────────────────────────────────────────────────────────
function loadEnv() {
  const raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}
const env = loadEnv()

const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local')
const ref = JSON.parse(Buffer.from(anon.split('.')[1], 'base64').toString()).ref
if (!ref) throw new Error('could not decode project ref from anon JWT')

const password = env.SUPABASE_DB_PASSWORD
if (!password) {
  console.error(
    'SUPABASE_DB_PASSWORD missing from .env.local. Collect it (secure_env_collect) and re-run.',
  )
  process.exit(2)
}

const REGION = 'eu-central-1' // RGPD: Frankfurt only
const sql = postgres({
  host: `aws-0-${REGION}.pooler.supabase.com`,
  port: 6543, // transaction pooler
  database: 'postgres',
  username: `postgres.${ref}`,
  password,
  ssl: 'require',
  prepare: false, // required for the transaction pooler
  max: 1,
  // The pooler TLS handshake can be slow to cold-start (observed 25s+ on a first
  // hit). The driver's default connect timeout is too short for that, so a run
  // fails with CONNECT_TIMEOUT even though the DB is healthy. Give the handshake
  // real headroom; this only affects how long we wait to establish, not queries.
  connect_timeout: 60,
  onnotice: () => {}, // silence NOTICEs (e.g. "already exists" from IF NOT EXISTS)
})

// ── apply ──────────────────────────────────────────────────────────────────
async function apply() {
  await sql`
    create table if not exists public._curio_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const applied = new Set(
    (await sql`select filename from public._curio_migrations`).map((r) => r.filename),
  )
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

  let count = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip   ${file} (already applied)`)
      continue
    }
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`  apply  ${file} ... `)
    await sql.begin(async (tx) => {
      await tx.unsafe(content)
      await tx`insert into public._curio_migrations (filename) values (${file})`
    })
    console.log('ok')
    count++
  }
  console.log(count === 0 ? 'No pending migrations.' : `Applied ${count} migration(s).`)
}

// ── verify ──────────────────────────────────────────────────────────────────
const EXPECTED_TABLES = [
  'users', 'topics', 'user_topics', 'projects', 'collections', 'sections',
  'brands', 'links', 'user_links', 'analytics_events', 'follows',
  'collection_follows', 'invitation_tokens', 'plans', 'notifications',
  'editorial', 'consent_logs',
]

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

/** Expect a statement to FAIL (constraint/trigger should reject it). The whole
 *  attempt runs in a transaction that is always rolled back, so nothing is
 *  persisted. A DB error → PASS (rejected as intended); no error → FAIL. */
async function expectReject(name, fn) {
  const ACCEPTED = '__accepted_but_should_reject__'
  try {
    await sql.begin(async (tx) => {
      await fn(tx)
      throw new Error(ACCEPTED) // roll back; signals the statement was accepted
    })
    record(name, false, 'unreachable') // begin always throws above
  } catch (e) {
    if (e.message === ACCEPTED) {
      record(name, false, 'statement was accepted but should have been rejected')
    } else {
      record(name, true, `rejected: ${String(e.message).split('\n')[0].slice(0, 90)}`)
    }
  }
}

async function verify() {
  // 1. all expected tables exist
  const present = (
    await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `
  ).map((r) => r.table_name)
  const missing = EXPECTED_TABLES.filter((t) => !present.includes(t))
  record('17 core tables present', missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${EXPECTED_TABLES.length} present`)

  // 2. RLS enabled on every core table
  const rls = await sql`
    select c.relname, c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any(${EXPECTED_TABLES})
  `
  const noRls = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname)
  record('RLS enabled on all core tables', noRls.length === 0,
    noRls.length ? `RLS off: ${noRls.join(', ')}` : 'all enabled')

  // 3. topics seed: 13 total, 10 core, 3 extended (inactive)
  const [{ total }] = await sql`select count(*)::int as total from public.topics`
  const [{ core }] = await sql`select count(*)::int as core from public.topics where is_core`
  const [{ ext }] =
    await sql`select count(*)::int as ext from public.topics where not is_core and not is_active`
  record('topics seed (13 = 10 core + 3 extended)',
    total === 13 && core === 10 && ext === 3,
    `total=${total} core=${core} extended_inactive=${ext}`)

  // 4. badge_color reused from tailwind palette (spot-check 3 measured hex)
  const [{ ok: badgeOk }] = await sql`
    select (
      (select badge_color from public.topics where id='travel') = '#D9C6A6' and
      (select badge_color from public.topics where id='design') = '#6A7B7A' and
      (select badge_color from public.topics where id='food')   = '#C1694F'
    ) as ok`
  record('badge_color hex match tailwind palette', badgeOk === true)

  // ── constraint / trigger smoke tests (each in a rolled-back tx) ───────────

  // 5. users.username check rejects a malformed handle. The CHECK fires before
  //    the auth.users FK, so a bad handle is rejected on the check (not the FK).
  await expectReject('users.username check rejects "AB" (too short)', async (tx) => {
    await tx`insert into public.users (id, username, display_name)
             values (gen_random_uuid(), 'AB', 'x')`
  })

  // 6. topics.display_order unique rejects a duplicate order value
  await expectReject('topics.display_order unique rejects duplicate', async (tx) => {
    await tx`insert into public.topics (id,label_en,label_fr,icon,display_order)
             values ('dup','D','D','x',1)` // display_order 1 already used by travel
  })

  // 7. links.status check rejects an unknown status (links has no url_origin col)
  await expectReject('links.status check rejects "bogus"', async (tx) => {
    await tx`insert into public.links (url_normalized,url_first_origin,title,status)
             values ('u1','o1','t','bogus')`
  })

  // 8. plans.plan_type check rejects unknown type (needs a user → FK fails first,
  //    so assert the check exists via pg_constraint instead)
  const [{ has: planCheck }] = await sql`
    select count(*) > 0 as has from pg_constraint
    where conrelid = 'public.plans'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%founding_curator%'`
  record('plans.plan_type check constraint present', planCheck === true)

  // 9. follows self-follow check present
  const [{ has: selfFollow }] = await sql`
    select count(*) > 0 as has from pg_constraint
    where conrelid = 'public.follows'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%<>%'`
  record('follows self-follow check present', selfFollow === true)

  // 10. section-coherence trigger present on user_links
  const [{ has: secTrig }] = await sql`
    select count(*) > 0 as has from pg_trigger
    where tgrelid = 'public.user_links'::regclass
      and tgname = 'trg_user_links_section_coherence'`
  record('user_links section-coherence trigger present', secTrig === true)

  // 11. saves_count trigger present
  const [{ has: savesTrig }] = await sql`
    select count(*) > 0 as has from pg_trigger
    where tgrelid = 'public.user_links'::regclass
      and tgname = 'trg_user_links_saves_count'`
  record('links saves_count trigger present', savesTrig === true)

  // 12. default-plan signup trigger present
  const [{ has: planTrig }] = await sql`
    select count(*) > 0 as has from pg_trigger
    where tgrelid = 'public.users'::regclass
      and tgname = 'trg_users_default_plan'`
  record('signup default-plan trigger present', planTrig === true)

  // 13. consent_logs.user_id is ON DELETE SET NULL (not cascade) — RGPD
  const [{ del: consentDel }] = await sql`
    select confdeltype as del from pg_constraint
    where conrelid = 'public.consent_logs'::regclass and contype = 'f'
      and conname like '%user_id%' limit 1`
  record('consent_logs.user_id FK = SET NULL (RGPD)', consentDel === 'n',
    `confdeltype=${consentDel} (n=set null, c=cascade)`)

  // 14. auth.users → public.users provisioning trigger present (0006)
  const [{ has: authTrig }] = await sql`
    select count(*) > 0 as has from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'trg_auth_user_created'`
  record('auth.users signup provisioning trigger present', authTrig === true)

  // 15. redeem_invitation_token(text,uuid) RPC present (0006). Match on the
  //     argument TYPE list (proargtypes → regtype names), independent of the
  //     parameter names that pg_get_function_identity_arguments includes.
  const [{ has: redeemFn }] = await sql`
    select count(*) > 0 as has from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'redeem_invitation_token'
      and array(select format_type(unnest(p.proargtypes), null)) = array['text','uuid']`
  record('redeem_invitation_token(text,uuid) RPC present', redeemFn === true)

  // 16. service_role has SELECT on a server-only table (0007 grants). Without
  //     this, a service-role read of invitation_tokens fails 42501 even though
  //     service_role bypasses RLS — GRANTs are a separate layer from RLS.
  const [{ has: svcGrant }] = await sql`
    select count(*) > 0 as has from information_schema.role_table_grants
    where grantee = 'service_role' and table_schema = 'public'
      and table_name = 'invitation_tokens' and privilege_type = 'SELECT'`
  record('service_role SELECT grant on invitation_tokens', svcGrant === true)

  // 17. collections.links_count column + maintenance trigger present (0010)
  const [{ has: linksCountCol }] = await sql`
    select count(*) > 0 as has from information_schema.columns
    where table_schema = 'public' and table_name = 'collections'
      and column_name = 'links_count'`
  record('collections.links_count column present', linksCountCol === true)

  const [{ has: linksCountTrig }] = await sql`
    select count(*) > 0 as has from pg_trigger
    where tgrelid = 'public.user_links'::regclass
      and tgname = 'trg_user_links_collection_count'`
  record('collections links_count trigger present', linksCountTrig === true)

  // 18. storage bucket 'collection-covers' exists and is public (0010)
  const bucket = await sql`
    select public from storage.buckets where id = 'collection-covers'`
  record('storage bucket collection-covers present + public',
    bucket.length === 1 && bucket[0].public === true,
    bucket.length === 1 ? `public=${bucket[0].public}` : 'bucket missing')

  // 19. owner-scoped write policy on storage.objects for the covers bucket
  const [{ has: coverInsertPol }] = await sql`
    select count(*) > 0 as has from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'collection_covers_insert_owner'`
  record('collection-covers owner insert policy present', coverInsertPol === true)

  // 20. extension_tokens table present with RLS on and NO anon/authenticated
  //     policy (deny-all to the browser; only service_role reaches it). 0014.
  const extPresent = present.includes('extension_tokens')
  record('extension_tokens table present', extPresent)

  const [{ rls: extRls }] = await sql`
    select coalesce(c.relrowsecurity, false) as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'extension_tokens'`
  record('extension_tokens RLS enabled', extRls === true)

  const [{ pols: extPols }] = await sql`
    select count(*)::int as pols from pg_policies
    where schemaname = 'public' and tablename = 'extension_tokens'`
  record('extension_tokens deny-all (no anon/authenticated policy)', extPols === 0,
    `policy count=${extPols}`)

  const [{ has: extUnique }] = await sql`
    select count(*) > 0 as has from pg_constraint
    where conrelid = 'public.extension_tokens'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%token_hash%'`
  record('extension_tokens.token_hash UNIQUE present', extUnique === true)

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
  return failed.length === 0
}

// ── main ────────────────────────────────────────────────────────────────────
try {
  if (!VERIFY_ONLY) {
    console.log(`\nApplying migrations to project ${ref} (${REGION})...`)
    await apply()
  }
  console.log('\nVerification:')
  const ok = await verify()
  await sql.end()
  process.exit(ok ? 0 : 1)
} catch (err) {
  console.error('\nFATAL:', err.message)
  await sql.end({ timeout: 5 }).catch(() => {})
  process.exit(3)
}
