#!/usr/bin/env node
/**
 * ⚠️  DEPRECATED (2026-08-30) — DO NOT RUN.
 *
 * This script pointed 5 demo collections at designer-mockup photos
 * (public/landing/tokyo.jpg, food-card.jpg, etc.) that don't match those
 * collections' actual titles/themes (e.g. a food photo on "Objets bien
 * dessinés", a travel photo on "Maisons à suivre"). It has been fully
 * superseded by scripts/seed-demo-curators.mjs, which now sets a themed,
 * locally-generated illustrated cover on every demo collection (see that
 * file's "COVERS & AVATARS" doc comment).
 *
 * Kept only because this sandbox's mounted filesystem can rename files but
 * not delete them (unlink is blocked) — Jay, feel free to `git rm
 * scripts/assign-landing-covers.mjs` on your machine, it does nothing useful
 * anymore. The hard exit below prevents it from running by accident.
 */
process.exit(1)
// eslint-disable-next-line no-unreachable
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing Supabase env vars in .env.local')

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COVER_MAP = [
  { name: 'Sources d’inspiration', cover: '/landing/tokyo.jpg' },
  { name: 'Objets bien dessinés', cover: '/landing/food-card.jpg' },
  { name: 'Icônes du mobilier', cover: '/landing/books-card.jpg' },
  { name: 'Maisons à suivre', cover: '/landing/escapes.jpg' },
  { name: 'Le vestiaire essentiel', cover: '/landing/style-card.jpg' },
]

for (const { name, cover } of COVER_MAP) {
  const { data, error } = await admin
    .from('collections')
    .update({ cover_image_url: cover })
    .eq('name', name)
    .eq('is_public', true)
    .select('id, name, cover_image_url')

  if (error) {
    console.error(`FAIL: ${name} — ${error.message}`)
  } else if (!data?.length) {
    console.warn(`SKIP: no public collection named "${name}"`)
  } else {
    console.log(`OK: ${name} → ${cover}`)
  }
}
