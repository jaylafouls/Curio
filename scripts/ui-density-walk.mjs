#!/usr/bin/env node
/**
 * UI density walk (branch fix/ui-container-density) — real-conditions visual
 * verification of the <PageContainer> migration across the connected pages.
 *
 * Mirrors the fix/ui-shell-header walk exactly:
 *   1. mint a disposable test user via the service-role admin API (fires the
 *      0006 trigger → public.users row), mark onboarding_completed so no funnel
 *      redirect, and seed a minimal-but-real universe (a topic, a project, a
 *      collection, one saved link) so the migrated pages render populated
 *      content, not just empty states;
 *   2. establish a real signed-in session (admin generateLink → verify OTP →
 *      access/refresh tokens) and materialise the EXACT @supabase/ssr auth
 *      cookies by driving a cookie-capturing server client through setSession —
 *      no hand-rolled cookie encoding;
 *   3. drive Playwright (playwright-core + the installed chromium 1228) with
 *      those cookies across the 7 migrated connected pages × {440px, desktop}
 *      × {en, fr}, screenshotting each into .gsd/activity/ui-density-walk/;
 *   4. tear the user down (public.users delete + auth admin delete) plus the
 *      shared canonical link/brand, leaving zero residue.
 *
 * Usage: node scripts/ui-density-walk.mjs   (dev server must be on :3000)
 */
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { chromium } from 'playwright-core'
import postgres from 'postgres'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, '.gsd', 'activity', 'ui-density-walk')
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CHROMIUM =
  process.env.CHROMIUM_PATH ||
  join(
    process.env.HOME,
    'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64',
    'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  )

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
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
const password = env.SUPABASE_DB_PASSWORD
if (!url || !anon || !serviceRole || !password) {
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

const suffix = randomUUID().slice(0, 8)
const email = `uiwalk-${suffix}@example.invalid`
const username = `uiwalk_${suffix}`.slice(0, 20)
const userPassword = `Pw-${randomUUID()}`

// The 7 migrated connected pages. profile uses the signed-in user's own
// username so it renders their (public) collection.
const PAGES = [
  { name: 'home', path: (u) => '/home' },
  { name: 'my-space', path: (u) => '/my-space' },
  { name: 'saved', path: (u) => '/saved' },
  { name: 'projects', path: (u) => '/projects' },
  { name: 'analytics', path: (u) => '/analytics' },
  { name: 'notifications', path: (u) => '/notifications' },
  { name: 'profile', path: (u) => `/profile/${u}` },
]
const VIEWPORTS = [
  { name: '440', width: 440, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
]
const LOCALES = ['en', 'fr']

let userId = null
let sharedLinkId = null
let sharedBrandId = null

async function cleanup() {
  if (userId) {
    try { await sql`delete from public.users where id = ${userId}` } catch {}
    try { await admin.auth.admin.deleteUser(userId) } catch {}
  }
  if (sharedLinkId) { try { await sql`delete from public.links where id = ${sharedLinkId}` } catch {} }
  if (sharedBrandId) { try { await sql`delete from public.brands where id = ${sharedBrandId}` } catch {} }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  console.log(`UI density walk — project ${ref}, ${REGION}, base ${BASE}`)
  console.log(`Test user: ${username} / ${email}\n`)

  // ── 1. mint user + seed a real universe ──────────────────────────────────
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: true,
    user_metadata: { username, full_name: 'UI Walk' },
  })
  if (cErr) throw new Error(`createUser failed: ${cErr.message}`)
  userId = created.user.id

  await sql`
    update public.users
    set username = ${username}, display_name = 'UI Walk',
        onboarding_completed = true, universe_name = 'UI Walk Universe'
    where id = ${userId}`

  const [topic] = await sql`select id from public.topics where is_core and is_active limit 1`
  await sql`insert into public.user_topics (user_id, topic_id) values (${userId}, ${topic.id})`

  const [proj] = await sql`
    insert into public.projects (owner_id, name, description)
    values (${userId}, 'Design Systems', 'Reference material for tokens & primitives')
    returning id`
  const [coll] = await sql`
    insert into public.collections (owner_id, project_id, topic_id, name, is_public)
    values (${userId}, ${proj.id}, ${topic.id}, 'Container patterns', true)
    returning id`
  const [sec] = await sql`
    insert into public.sections (collection_id, name) values (${coll.id}, 'Reading') returning id`

  const [brand] = await sql`insert into public.brands (name) values (${'uiwalk-' + suffix}) returning id`
  sharedBrandId = brand.id
  const [link] = await sql`
    insert into public.links (url_normalized, url_first_origin, title, brand_id)
    values (${'https://example.invalid/' + suffix}, 'https://example.invalid',
            'Every Layout — the Container', ${sharedBrandId})
    returning id`
  sharedLinkId = link.id
  await sql`
    insert into public.user_links (user_id, link_id, collection_id, section_id, url_origin)
    values (${userId}, ${sharedLinkId}, ${coll.id}, ${sec.id}, 'https://example.invalid')`

  console.log('Seeded: 1 topic, 1 project, 1 public collection, 1 saved link.')

  // ── 2. real session → exact SSR cookies ──────────────────────────────────
  // generateLink gives an email_otp we can verify to a full session without SMTP.
  const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (lErr) throw new Error(`generateLink failed: ${lErr.message}`)
  const otp = linkData.properties?.email_otp
  if (!otp) throw new Error('no email_otp in generateLink response')

  const verifier = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: sess, error: vErr } = await verifier.auth.verifyOtp({
    email,
    token: otp,
    type: 'magiclink',
  })
  if (vErr) throw new Error(`verifyOtp failed: ${vErr.message}`)
  const { access_token, refresh_token } = sess.session

  // Materialise byte-identical @supabase/ssr cookies by driving a cookie-
  // capturing server client through setSession — same code path the app uses.
  const captured = []
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [],
      setAll: (list) => list.forEach((c) => captured.push(c)),
    },
  })
  const { error: sErr } = await ssr.auth.setSession({ access_token, refresh_token })
  if (sErr) throw new Error(`setSession failed: ${sErr.message}`)
  const cookies = captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }))
  console.log(`Session cookies materialised: ${cookies.map((c) => c.name).join(', ')}\n`)

  // ── 3. the walk ──────────────────────────────────────────────────────────
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true })
  const shots = []
  let httpFail = false
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      })
      await context.addCookies(cookies)
      const page = await context.newPage()
      for (const locale of LOCALES) {
        for (const p of PAGES) {
          const target = `${BASE}/${locale}${p.path(username)}`
          const resp = await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 })
          const status = resp?.status() ?? 0
          // A signed-in protected route must render 200 on its own URL, never
          // 307-redirect to Welcome. Landing on '/'+locale means the session
          // cookie was rejected.
          const landed = new URL(page.url()).pathname
          const ok = status === 200 && landed.includes(p.name === 'profile' ? '/profile/' : `/${p.name}`)
          if (!ok) httpFail = true
          const file = `${p.name}__${locale}__${vp.name}.png`
          await page.screenshot({ path: join(OUT, file), fullPage: true })
          shots.push({ file, status, landed, ok })
          console.log(`  ${ok ? 'OK ' : 'ERR'} ${vp.name.padEnd(7)} ${locale} ${p.name.padEnd(14)} → ${status} ${landed}`)
        }
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }

  console.log(`\n${shots.length} screenshots written to ${OUT}`)
  if (httpFail) throw new Error('one or more pages did not render 200 on their own URL')
}

main()
  .then(cleanup)
  .then(async () => {
    await sql.end({ timeout: 5 })
    console.log('\nRESULT: PASS — walk complete, test user torn down')
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('\nFATAL:', err.message)
    await cleanup().catch(() => {})
    await sql.end({ timeout: 5 }).catch(() => {})
    console.log('RESULT: FAIL')
    process.exit(1)
  })
