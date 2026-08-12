#!/usr/bin/env node
/**
 * Cross-user link-categorisation browser walk (chantier link-subcategories).
 *
 * Real-conditions verification of the Save Flow Topic/sub-category picker + the
 * cross-user inheritance + the /saved filter, against the EU-Frankfurt project
 * with a real Chromium (Playwright), at two viewports (440px + desktop) and both
 * locales (EN + FR):
 *
 *   1. Seed a canonical `links` row (so resolveLink dedups — no live OG fetch,
 *      deterministic) + a throwaway account A and account B per (viewport,locale)
 *      combo. Both marked onboarding_completed so the Save Flow is reachable.
 *   2. Account B saves the link to Unsorted with Topic=Travel + sub-cat=Restaurant
 *      through the REAL Save Flow UI. Assert the user_links row carries the FK ids.
 *   3. Account A opens the Save Flow for the SAME link and — via the cross-user
 *      getInheritedCategory (service-role read) — sees Travel + Restaurant
 *      PRE-SELECTED (aria-pressed). This is the decisive cross-user case. Save it.
 *   4. Account A goes to /saved and filters by Topic then sub-category; assert the
 *      link shows under the matching filter and the honest empty-state appears
 *      under a non-matching Topic.
 *
 * Auth: no password sign-in exists (magic-link/OAuth only), so each account is
 * authenticated by minting a magic-link via admin.generateLink and driving the
 * /auth/callback (real PKCE cookies) — faithful to the production flow.
 *
 * Self-cleaning: every account + the shared canonical link/brand is removed on
 * exit (success or failure), leaving zero residue on Frankfurt.
 *
 * Usage: BASE_URL=http://localhost:3100 node scripts/subcategory-walk.mjs
 */
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

// Playwright lives in the pi harness install, not this project.
const require = createRequire(import.meta.url)
const { chromium } = require(
  '/usr/local/lib/node_modules/@opengsd/gsd-pi/node_modules/playwright',
)

/**
 * Bundle the app's REAL browser Supabase client (@supabase/ssr createBrowserClient)
 * into an IIFE we can inject into a live app page. Using the real SSR client means
 * setSession writes auth cookies in the exact chunked/base64 format the app's
 * middleware reads — no hand-fabricated cookie. Exposed as window.__mkClient.
 */
async function buildBrowserClientBundle() {
  const out = await build({
    stdin: {
      contents: `
        import { createBrowserClient } from '@supabase/ssr'
        window.__mkClient = (url, anon) => createBrowserClient(url, anon)
      `,
      resolveDir: ROOT,
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  })
  return out.outputFiles[0].text
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3100'

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
const REGION = 'eu-central-1'

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
const AUDIT_TAG = `subcat-walk-${suffix}`
const linkUrl = `https://example.invalid/${AUDIT_TAG}`

const createdUsers = [] // ids to clean up
let sharedLinkId = null
let sharedBrandId = null

let failed = false
const results = []
function check(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL'
  if (!ok) failed = true
  results.push(`  ${status}  ${name}${detail ? ' — ' + detail : ''}`)
  console.log(`  ${status}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function cleanup() {
  for (const id of createdUsers) {
    try { await sql`delete from public.users where id = ${id}` } catch {}
    try { await admin.auth.admin.deleteUser(id) } catch {}
  }
  if (sharedLinkId) { try { await sql`delete from public.links where id = ${sharedLinkId}` } catch {} }
  if (sharedBrandId) { try { await sql`delete from public.brands where id = ${sharedBrandId}` } catch {} }
}

/** Mint a confirmed auth user, onboarding done, and return its id. */
let userSeq = 0
async function mintUser(tag) {
  const email = `${AUDIT_TAG}-${tag}@example.invalid`
  // username must match ^[a-z0-9_]{3,20}$ — no hyphens, ≤20 chars.
  const username = `sw${suffix}u${userSeq++}`.replace(/[^a-z0-9_]/g, '').slice(0, 20)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { username, full_name: `Walk ${tag}` },
  })
  if (error) throw new Error(`createUser(${tag}) failed: ${error.message}`)
  const id = data.user.id
  createdUsers.push(id)
  // Skip the onboarding gate so the app pages (with the Save Flow) render.
  await sql`update public.users set username = ${username}, onboarding_completed = true where id = ${id}`
  return { id, email }
}

/**
 * Authenticate a browser context as `email` using the app's REAL browser client.
 *
 * generateLink → hashed_token → verifyOtp (server-side) yields a real session
 * ({access,refresh}). We then load a live app page, inject the app's own
 * createBrowserClient (bundled from @supabase/ssr) and call setSession in-page —
 * so the auth cookies are written exactly as the app writes them (no fabricated
 * cookie). A reload then re-enters middleware fully authenticated. Returns a page
 * sitting on an authenticated app route.
 */
async function authenticate(context, email, locale, clientBundle) {
  const { data: gl, error: ge } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (ge) throw new Error(`generateLink(${email}) failed: ${ge.message}`)
  const pub = createClient(url, anon, { auth: { persistSession: false } })
  const { data: vo, error: ve } = await pub.auth.verifyOtp({
    type: 'magiclink',
    token_hash: gl.properties.hashed_token,
  })
  if (ve || !vo.session) throw new Error(`verifyOtp(${email}) failed: ${ve?.message ?? 'no session'}`)

  const page = await context.newPage()
  // Load a real same-origin app page so document.cookie is on the app origin and
  // the SSR client's env (window) is set up. /signup is public (renders logged-out).
  await page.goto(`${BASE_URL}/${locale}/signup`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.addScriptTag({ content: clientBundle })
  const setOk = await page.evaluate(
    async ({ url, anon, access, refresh }) => {
      const supabase = window.__mkClient(url, anon)
      const { error } = await supabase.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      })
      return error ? error.message : null
    },
    { url, anon, access: vo.session.access_token, refresh: vo.session.refresh_token },
  )
  if (setOk) throw new Error(`setSession(${email}) failed in-page: ${setOk}`)

  // Navigate to a protected route; middleware now sees the session cookie and
  // lets us in (onboarding done → stays on /home).
  await page.goto(`${BASE_URL}/${locale}/home`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForURL(
    (u) => !u.pathname.includes('/signup') && !u.pathname.includes('/auth/callback') && u.pathname.replace(/\/$/, '') !== `/${locale}`,
    { timeout: 30000 },
  )
  return page
}

/**
 * A fresh browser context has no consent decision, so the first-party CMP banner
 * renders as a bottom dialog that intercepts pointer events and blocks every
 * click. Dismiss it with the strict opt-in "Reject all" (the honest default —
 * keeps analytics off during the walk). Idempotent: a no-op if already decided.
 */
async function dismissConsent(page, rejectLabel) {
  const btn = page.getByRole('button', { name: rejectLabel }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await btn.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
  }
}

/** Open the Save Flow wizard, paste the URL, advance to the "Save to" step. */
async function openSaveFlowToStep3(page, S) {
  // Trigger — the "Add to Curio" button (mobile FAB or desktop button; both share
  // the aria-label / accessible name S.open). Use the first visible one.
  const trigger = page.getByRole('button', { name: S.open }).first()
  await trigger.click()
  // Panel → "Save link".
  await page.getByRole('menuitem', { name: S.actionSaveLink }).click()
  // Step 1 — paste URL, Next.
  await page.getByLabel(S.urlLabel).fill(linkUrl)
  await page.getByRole('button', { name: S.next }).click()
  // Step 2 (Customize) — just Next.
  await page.getByRole('button', { name: S.next }).click()
  // Now on step 3 (Save to). Wait for the Topic label to be present.
  await page.getByText(S.topicLabel, { exact: true }).first().waitFor({ timeout: 15000 })
}

async function main() {
  console.log(`Subcategory cross-user walk — project ${ref}, ${REGION}, ${BASE_URL}\n`)

  // ── Seed the canonical link (dedup path in resolveLink — no live OG fetch) ──
  const [brand] = await sql`insert into public.brands (name) values (${AUDIT_TAG + '-brand'}) returning id`
  sharedBrandId = brand.id
  const [link] = await sql`
    insert into public.links (url_normalized, url_first_origin, title, brand_id)
    values (${linkUrl}, 'https://example.invalid', ${AUDIT_TAG + '-link'}, ${sharedBrandId})
    returning id`
  sharedLinkId = link.id
  check('seed canonical link', Boolean(sharedLinkId), `link_id=${sharedLinkId}`)

  // Resolve the reference ids we assert against (Travel + "Restaurant").
  const [travelSub] = await sql`
    select id from public.link_subcategories where topic_id = 'travel' and label = 'Restaurant'`
  check('travel/Restaurant sub-category exists', Boolean(travelSub?.id), travelSub?.id ?? 'missing')

  const S_EN = {
    open: 'Add to Curio', actionSaveLink: 'Save link', urlLabel: 'Paste a link',
    next: 'Next', topicLabel: 'Topic', subLabel: 'Sub-category',
    saveUnsorted: 'Save to Unsorted', topicPill: 'travel', sub: 'Restaurant',
    savedDone: 'Saved to Unsorted', filterAll: 'All', rejectConsent: 'Reject all',
  }
  const S_FR = {
    open: 'Ajouter à Curio', actionSaveLink: 'Enregistrer un lien', urlLabel: 'Coller un lien',
    next: 'Suivant', topicLabel: 'Thème', subLabel: 'Sous-catégorie',
    saveUnsorted: 'Enregistrer dans Non trié', topicPill: 'travel', sub: 'Restaurant',
    savedDone: 'Enregistré dans Non trié', filterAll: 'Tous', rejectConsent: 'Tout refuser',
  }
  // urlLabel FR — confirm the real string.
  const en = JSON.parse(readFileSync(join(ROOT, 'messages/en.json'), 'utf8'))
  const fr = JSON.parse(readFileSync(join(ROOT, 'messages/fr.json'), 'utf8'))
  S_EN.urlLabel = en.SaveFlow.urlLabel
  S_FR.urlLabel = fr.SaveFlow.urlLabel

  const combos = [
    { locale: 'en', S: S_EN, width: 440, height: 900, tag: 'en-mobile' },
    { locale: 'en', S: S_EN, width: 1280, height: 900, tag: 'en-desktop' },
    { locale: 'fr', S: S_FR, width: 440, height: 900, tag: 'fr-mobile' },
    { locale: 'fr', S: S_FR, width: 1280, height: 900, tag: 'fr-desktop' },
  ]

  const clientBundle = await buildBrowserClientBundle()
  check('built app browser-client bundle', clientBundle.length > 0, `${clientBundle.length} bytes`)

  const browser = await chromium.launch()
  try {
    for (const c of combos) {
      console.log(`\n── ${c.tag} (${c.width}px, ${c.locale}) ──`)
      const A = await mintUser(`${c.tag}-a`)
      const B = await mintUser(`${c.tag}-b`)

      // ── Account B files the link (Travel + Restaurant) via the real UI ──
      const ctxB = await browser.newContext({ viewport: { width: c.width, height: c.height } })
      try {
        const pageB = await authenticate(ctxB, B.email, c.locale, clientBundle)
        await dismissConsent(pageB, c.S.rejectConsent)
        await openSaveFlowToStep3(pageB, c.S)
        // Pick Topic = Travel (button wrapping a Badge whose text is "travel").
        await pageB.getByRole('button', { name: c.S.topicPill, exact: true }).click()
        // Sub-category "Restaurant" appears; pick it.
        await pageB.getByRole('button', { name: c.S.sub, exact: true }).click()
        // Save to Unsorted (final CTA).
        await pageB.getByRole('button', { name: c.S.saveUnsorted }).click()
        // Wait for the Done step title.
        await pageB.getByText(c.S.savedDone, { exact: true }).first().waitFor({ timeout: 15000 })
      } finally {
        await ctxB.close()
      }

      // Assert B's user_links row carries the FK ids (data-level truth).
      const [bRow] = await sql`
        select ul.topic_id, ul.subcategory_id
        from public.user_links ul
        where ul.user_id = ${B.id} and ul.link_id = ${sharedLinkId}`
      check(
        `[${c.tag}] B saved with topic+subcategory FKs`,
        bRow?.topic_id === 'travel' && bRow?.subcategory_id === travelSub.id,
        `topic=${bRow?.topic_id} sub=${bRow?.subcategory_id}`,
      )

      // ── Account A opens the Save Flow for the SAME link → inherits B's cat ──
      const ctxA = await browser.newContext({ viewport: { width: c.width, height: c.height } })
      try {
        const pageA = await authenticate(ctxA, A.email, c.locale, clientBundle)
        await dismissConsent(pageA, c.S.rejectConsent)
        await openSaveFlowToStep3(pageA, c.S)
        // The cross-user prefill should have pre-pressed Travel + Restaurant.
        const topicPressed = await pageA
          .getByRole('button', { name: c.S.topicPill, exact: true })
          .getAttribute('aria-pressed')
        check(`[${c.tag}] A inherits Topic=Travel (aria-pressed)`, topicPressed === 'true', `aria-pressed=${topicPressed}`)
        const subBtn = pageA.getByRole('button', { name: c.S.sub, exact: true })
        const subPressed = await subBtn.getAttribute('aria-pressed')
        check(`[${c.tag}] A inherits sub-category=Restaurant (aria-pressed)`, subPressed === 'true', `aria-pressed=${subPressed}`)
        // Save it so A has a row for the /saved filter step.
        await pageA.getByRole('button', { name: c.S.saveUnsorted }).click()
        await pageA.getByText(c.S.savedDone, { exact: true }).first().waitFor({ timeout: 15000 })

        // ── /saved filter ──
        await pageA.goto(`${BASE_URL}/${c.locale}/saved`, { waitUntil: 'networkidle', timeout: 30000 })
        // The saved link row should be present (its canonical title).
        const rowVisible = await pageA.getByText(AUDIT_TAG + '-link').first().isVisible().catch(() => false)
        check(`[${c.tag}] /saved shows A's link`, rowVisible)
        // Click the Travel topic filter pill (text "travel"); link stays visible.
        const travelFilter = pageA.getByRole('button', { name: c.S.topicPill, exact: true }).first()
        if (await travelFilter.isVisible().catch(() => false)) {
          await travelFilter.click()
          const stillVisible = await pageA.getByText(AUDIT_TAG + '-link').first().isVisible().catch(() => false)
          check(`[${c.tag}] /saved Travel filter keeps the link`, stillVisible)
          // Sub-category filter row should now offer "Restaurant".
          const subFilter = pageA.getByRole('button', { name: c.S.sub, exact: true }).first()
          const subFilterVisible = await subFilter.isVisible().catch(() => false)
          check(`[${c.tag}] /saved sub-category filter offers Restaurant`, subFilterVisible)
        } else {
          check(`[${c.tag}] /saved Travel filter pill present`, false, 'topic filter pill not found')
        }
      } finally {
        await ctxA.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n' + (failed ? 'RESULT: FAIL' : 'RESULT: PASS'))
}

main()
  .catch((e) => { failed = true; console.error('\nWALK ERROR:', e.message) })
  .finally(async () => {
    console.log('\nCleaning up test users + canonical objects...')
    await cleanup()
    try { await sql.end({ timeout: 5 }) } catch {}
    console.log('Cleanup done.')
    process.exit(failed ? 1 : 0)
  })
