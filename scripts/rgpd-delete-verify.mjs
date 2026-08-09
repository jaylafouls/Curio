#!/usr/bin/env node
/**
 * RGPD delete-account re-verification (Phase 5, chantier rgpd-audit).
 *
 * Exercises the EXACT deleteAccount() path shipped in lib/settings/actions.ts
 * (Fix B), in real conditions against the EU-Frankfurt project:
 *
 *   1. mint a real auth user via the service-role admin client;
 *   2. seed data on EVERY table that references public.users — cascade children
 *      (must vanish) AND set-null survivors (consent_logs / analytics_events,
 *      must survive with user_id → NULL);
 *   3. run the two-step teardown the server action now does, using ONLY the
 *      supabase-js admin client (no raw SQL in the delete path):
 *        a. admin.from('users').delete().eq('id', userId)   // app-graph cascade
 *        b. admin.auth.admin.deleteUser(userId)              // bare auth user
 *   4. assert zero residue on every cascade child (incl. extension_tokens, the
 *      FK added in chantier #5) and that consent_logs survives anonymised;
 *   5. cascade-clean the shared canonical objects (link/brand) it created.
 *
 * Seeding uses the pooler (postgres driver) because it needs to touch tables the
 * app never writes directly (brands, links, analytics_events) and to assert
 * residue precisely. The DELETE path under test uses supabase-js only.
 *
 * Self-cleaning: on any exit it removes the test user (if still present) and the
 * shared canonical objects, leaving zero audit residue.
 *
 * Usage: node scripts/rgpd-delete-verify.mjs
 */
import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
const password = env.SUPABASE_DB_PASSWORD
if (!anon || !url || !serviceRole || !password) {
  console.error('Missing env (need URL, ANON, SERVICE_ROLE, DB_PASSWORD).')
  process.exit(2)
}
const ref = JSON.parse(Buffer.from(anon.split('.')[1], 'base64').toString()).ref

const REGION = 'eu-central-1' // RGPD: Frankfurt only
const sql = postgres({
  host: `aws-0-${REGION}.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  username: `postgres.${ref}`,
  password,
  ssl: 'require',
  prepare: false,
  max: 1,
  connect_timeout: 60,
  onnotice: () => {},
})

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Unique markers so residue sweeps can find our objects unambiguously.
const suffix = randomUUID().slice(0, 8)
const AUDIT_TAG = `rgpd-audit-${suffix}`
const email = `rgpd-audit-${suffix}@example.invalid`
const username = `rgpd_${suffix}`.slice(0, 20)

let userId = null
let sharedLinkId = null
let sharedBrandId = null

async function cleanupShared() {
  // Cascade-clean anything left: the test user (if the delete-under-test never
  // ran) and the shared canonical objects we minted.
  if (userId) {
    try {
      await sql`delete from public.users where id = ${userId}`
    } catch {}
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {}
  }
  if (sharedLinkId) {
    try {
      await sql`delete from public.links where id = ${sharedLinkId}`
    } catch {}
  }
  if (sharedBrandId) {
    try {
      await sql`delete from public.brands where id = ${sharedBrandId}`
    } catch {}
  }
  // Anonymised consent/analytics rows tied to this run (user_id now NULL) — sweep
  // by policy_version marker we stamped, so we never touch real rows.
  try {
    await sql`delete from public.consent_logs where policy_version = ${AUDIT_TAG}`
  } catch {}
}

let failed = false
function check(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL'
  if (!ok) failed = true
  console.log(`  ${status}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function main() {
  console.log(
    `RGPD delete-account re-verification (Fix B) — project ${ref}, ${REGION}`,
  )
  console.log(`Test user: ${username} / ${email}\n`)

  // ── 1. mint a real auth user (fires the 0006 trigger → public.users row) ──
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { username, full_name: 'RGPD Audit' },
  })
  if (cErr) throw new Error(`createUser failed: ${cErr.message}`)
  userId = created.user.id

  // Override the provisional username the trigger minted, to our marker.
  await sql`update public.users set username = ${username}, display_name = 'RGPD Audit' where id = ${userId}`

  // ── 2. seed data across every FK-to-users table ──────────────────────────
  console.log('Seeding data across all cascade + set-null tables...')

  // Shared canonical objects (not owned by the user; must survive the delete).
  const [brand] =
    await sql`insert into public.brands (name) values (${AUDIT_TAG + '-brand'}) returning id`
  sharedBrandId = brand.id
  const [link] = await sql`
    insert into public.links (url_normalized, url_first_origin, title, brand_id)
    values (${'https://example.invalid/' + AUDIT_TAG}, 'https://example.invalid', ${AUDIT_TAG + '-link'}, ${sharedBrandId})
    returning id`
  sharedLinkId = link.id

  // A second user so we can seed a follows edge (self-follow is forbidden).
  const { data: created2, error: c2Err } = await admin.auth.admin.createUser({
    email: `rgpd-audit-${suffix}-f@example.invalid`,
    email_confirm: true,
    user_metadata: { username: `rgpdf_${suffix}`.slice(0, 20), full_name: 'RGPD Follow' },
  })
  if (c2Err) throw new Error(`createUser (follow) failed: ${c2Err.message}`)
  const followedId = created2.user.id

  // user_topics
  const [topic] = await sql`select id from public.topics limit 1`
  await sql`insert into public.user_topics (user_id, topic_id) values (${userId}, ${topic.id})`
  // project
  const [proj] =
    await sql`insert into public.projects (owner_id, name) values (${userId}, 'p') returning id`
  // collection (+ section)
  const [coll] = await sql`
    insert into public.collections (owner_id, project_id, topic_id, name)
    values (${userId}, ${proj.id}, ${topic.id}, 'c') returning id`
  const [sec] =
    await sql`insert into public.sections (collection_id, name) values (${coll.id}, 's') returning id`
  // user_links — the row whose DELETE trigger + cascade-deleted collection
  // triggered the GoTrue 500. THIS is the decisive case Fix B must survive.
  await sql`
    insert into public.user_links (user_id, link_id, collection_id, section_id, url_origin)
    values (${userId}, ${sharedLinkId}, ${coll.id}, ${sec.id}, 'https://example.invalid')`
  // follows (self-ref FK, both directions covered by follower_id)
  await sql`insert into public.follows (follower_id, followed_id) values (${userId}, ${followedId})`
  // collection_follows
  const [coll2] = await sql`
    insert into public.collections (owner_id, topic_id, name)
    values (${followedId}, ${topic.id}, 'c2') returning id`
  await sql`insert into public.collection_follows (user_id, collection_id) values (${userId}, ${coll2.id})`
  // notifications (recipient + actor)
  await sql`insert into public.notifications (recipient_id, actor_id, type) values (${userId}, ${followedId}, 'follow')`
  // plans row already exists (0004 trigger) — leave it.
  // extension_tokens (chantier #5 — the FK cascade this chantier must re-prove)
  await sql`
    insert into public.extension_tokens (user_id, token_hash, label)
    values (${userId}, ${'hash-' + AUDIT_TAG}, 'audit')`
  // SET-NULL survivors — stamped with AUDIT_TAG so cleanup is precise.
  await sql`
    insert into public.consent_logs (user_id, consent_type, given, policy_version)
    values (${userId}, 'analytics', true, ${AUDIT_TAG})`
  await sql`
    insert into public.analytics_events (user_id, link_id, event_type)
    values (${userId}, ${sharedLinkId}, 'impression')`

  // Confirm the seed is actually present before deleting.
  const pre = await sql`
    select
      (select count(*) from public.user_links where user_id = ${userId})::int as ul,
      (select count(*) from public.extension_tokens where user_id = ${userId})::int as et,
      (select count(*) from public.consent_logs where user_id = ${userId})::int as cl,
      (select count(*) from public.analytics_events where user_id = ${userId})::int as ae`
  check(
    'seed present pre-delete',
    pre[0].ul === 1 && pre[0].et === 1 && pre[0].cl === 1 && pre[0].ae === 1,
    `user_links=${pre[0].ul} extension_tokens=${pre[0].et} consent_logs=${pre[0].cl} analytics_events=${pre[0].ae}`,
  )

  // ── 3. run the EXACT server-action path (Fix B), supabase-js only ────────
  console.log('\nRunning deleteAccount() path (Fix B) via supabase-js admin...')
  const { error: rowErr } = await admin.from('users').delete().eq('id', userId)
  check('step 2: admin.from(users).delete()', !rowErr, rowErr ? rowErr.message : 'ok')

  const { error: delErr } = await admin.auth.admin.deleteUser(userId)
  check(
    'step 3: admin.auth.admin.deleteUser() → 200',
    !delErr,
    delErr ? JSON.stringify(delErr) : 'ok',
  )
  const deletedMainUser = !delErr
  if (deletedMainUser) userId = null // it's gone; don't re-delete in cleanup

  // ── 4. assert residue ────────────────────────────────────────────────────
  console.log('\nAsserting zero residue on cascade children...')
  const testId = created.user.id
  const residue = await sql`
    select
      (select count(*) from public.users where id = ${testId})::int as users,
      (select count(*) from public.user_topics where user_id = ${testId})::int as user_topics,
      (select count(*) from public.projects where owner_id = ${testId})::int as projects,
      (select count(*) from public.collections where owner_id = ${testId})::int as collections,
      (select count(*) from public.user_links where user_id = ${testId})::int as user_links,
      (select count(*) from public.follows where follower_id = ${testId})::int as follows,
      (select count(*) from public.collection_follows where user_id = ${testId})::int as coll_follows,
      (select count(*) from public.notifications where recipient_id = ${testId})::int as notifications,
      (select count(*) from public.plans where user_id = ${testId})::int as plans,
      (select count(*) from public.extension_tokens where user_id = ${testId})::int as extension_tokens`
  const r = residue[0]
  const totalResidue = Object.values(r).reduce((a, b) => a + b, 0)
  for (const [table, count] of Object.entries(r)) {
    check(`cascade child empty: ${table}`, count === 0, `count=${count}`)
  }

  // consent_logs / analytics_events must SURVIVE, anonymised (user_id NULL).
  console.log('\nAsserting SET-NULL survivors are anonymised...')
  const survivors = await sql`
    select
      (select count(*) from public.consent_logs where policy_version = ${AUDIT_TAG})::int as consent_total,
      (select count(*) from public.consent_logs where policy_version = ${AUDIT_TAG} and user_id is null)::int as consent_null,
      (select count(*) from public.analytics_events where link_id = ${sharedLinkId})::int as analytics_total,
      (select count(*) from public.analytics_events where link_id = ${sharedLinkId} and user_id is null)::int as analytics_null`
  const s = survivors[0]
  check(
    'consent_logs survives anonymised',
    s.consent_total === 1 && s.consent_null === 1,
    `total=${s.consent_total} null=${s.consent_null}`,
  )
  check(
    'analytics_events survives anonymised',
    s.analytics_total === 1 && s.analytics_null === 1,
    `total=${s.analytics_total} null=${s.analytics_null}`,
  )

  // Clean the 2nd (follow) user's graph now that assertions are done.
  await sql`delete from public.users where id = ${followedId}`
  await admin.auth.admin.deleteUser(followedId).catch(() => {})

  console.log(
    `\nTotal cascade-child residue: ${totalResidue} (expected 0). ` +
      `extension_tokens residue: ${r.extension_tokens} (chantier #5 FK).`,
  )
}

main()
  .then(cleanupShared)
  .then(async () => {
    await sql.end({ timeout: 5 })
    console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS — Fix B verified in real conditions')
    process.exit(failed ? 1 : 0)
  })
  .catch(async (err) => {
    console.error('\nFATAL:', err.message)
    await cleanupShared().catch(() => {})
    await sql.end({ timeout: 5 }).catch(() => {})
    process.exit(1)
  })
