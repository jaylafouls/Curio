#!/usr/bin/env node
/**
 * Curio demo-curator seed — creates 5 clearly-labelled fictional Founding
 * Curators (Travel / Style / Design / Books / Food) with Projects, public
 * Collections and categorised Links, so the live site can be exercised in
 * real conditions beyond the owner's own test account.
 *
 * ⚠️  These accounts are injected into the SAME Supabase project that serves the
 * real "prod" (no separate staging). They are intentionally easy to spot and
 * purge before any real public launch:
 *   - emails    : demo-<spec>@curio.test          (the .test TLD never resolves)
 *   - usernames : @curio_demo_<spec>
 *   - a marker  : bio ends with the DEMO_MARKER string below
 * See the "PURGE" section at the bottom of this file, or run with --purge.
 *
 * ── HOW ACCOUNTS ARE CREATED (verified against the real schema) ──────────────
 * Nothing writes public.users directly. Inserting an auth.users row fires
 * trg_auth_user_created → handle_new_auth_user() (0006), which provisions a
 * public.users row with a PROVISIONAL username (user_<8hex>) + a 'free' plan
 * (via trg_users_default_plan, 0004). So the flow is:
 *   1. auth.admin.createUser(...)          → provisions public.users + free plan
 *   2. update public.users                 → real username/display_name/bio/
 *                                            avatar + is_founding_curator=true
 * We use the service-role Admin API (not raw SQL into auth.users) because it
 * owns password hashing / identities / confirmation correctly.
 *
 * ── CONTENT MODEL (exact columns, verified) ─────────────────────────────────
 *   projects     : owner_id, name, description, color            (never public)
 *   collections  : owner_id, project_id?, topic_id(not null), name, description,
 *                  cover_image_url?, is_public. slug is trigger-assigned (0008);
 *                  links_count is trigger-maintained (0010) — NEVER set by hand.
 *   links        : canonical, no owner. url_normalized is UNIQUE → idempotency key.
 *   user_links   : the real "save". user_id, link_id, collection_id, topic_id?,
 *                  subcategory_id?. section_id left NULL (coherence trigger 0004).
 *                  Inserting one bumps collections.links_count via the trigger.
 *   link_subcategories : Travel carries 6 (Hébergement/Restaurant/Lieu à voir/
 *                  Activité/Transport/Autre); resolved by label at runtime.
 *
 * ── COVERS & AVATARS (2026-08-30 rewrite) ────────────────────────────────────
 * Every collection and every curator now points at a static file under
 * public/collections/ and public/curators/ — locally-generated illustrated
 * art (Python/PIL, on-brand Topic colours + a simple abstract motif matching
 * each collection's actual title/theme), not the designer-mockup photos the
 * landing page borrowed earlier (tokyo.jpg, food-card.jpg, etc. — wrong theme
 * per collection) nor any Storage upload. next/image already serves local
 * public/ assets, so cover_image_url / avatar_url are just set to '/collections/
 * <slug>.jpg' / '/curators/<slug>.jpg' directly — no bucket, no upload, no
 * network. This supersedes and makes scripts/assign-landing-covers.mjs
 * redundant (removed — it was patching in the mismatched mockup photos this
 * rewrite replaces). Every collection now carries a themed cover (the old
 * "withCover: false → Topic-colour fallback card" tier is no longer exercised
 * by this seed, but the CoverArt fallback itself is untouched for real users
 * with no cover).
 *
 * ── IDEMPOTENT ──────────────────────────────────────────────────────────────
 * Re-running never duplicates: accounts are looked up by email, links upserted
 * on url_normalized, projects/collections matched on (owner_id, name), user_links
 * on their natural unique tuple. Safe to run repeatedly.
 *
 * Usage:
 *   node scripts/seed-demo-curators.mjs           # create/refresh demo curators
 *   node scripts/seed-demo-curators.mjs --verify  # read-only: report what exists
 *   node scripts/seed-demo-curators.mjs --purge    # delete all demo curators + content
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const MODE = process.argv.includes('--purge')
  ? 'purge'
  : process.argv.includes('--verify')
    ? 'verify'
    : 'seed'

// A stable, greppable marker stamped on every demo profile's bio. Purge and
// verify both key off the email prefix, but this makes a demo account obvious
// in the DB/UI even at a glance.
const DEMO_MARKER = '[compte démo Curio]'
const DEMO_PASSWORD = 'curio-demo-' + 'Aa1!' // valid; accounts are never logged into by humans

// ── env ─────────────────────────────────────────────────────────────────────
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
if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing from .env.local')
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env.local')

// Service-role client: bypasses RLS (creates users, writes any owner's rows,
// uploads covers). Sessionless — this is a privileged batch tool, not a login.
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── demo dataset ─────────────────────────────────────────────────────────────
// One entry per curator. topic_id must be one of the seeded core topics (0003).
// Each collection carries a static `cover` path (public/collections/*.jpg).
// Links carry a subcategoryLabel only for Travel (the others resolve topic alone).
const CURATORS = [
  {
    spec: 'travel',
    email: 'demo-travel@curio.test',
    username: 'curio_demo_travel',
    displayName: 'Camille Voyage',
    location: 'Lisbonne, PT',
    bio: `Curatrice voyage — hôtels de charme, tables locales et lieux à voir. ${DEMO_MARKER}`,
    topic: 'travel',
    avatar: '/curators/camille-voyage.jpg',
    projects: [
      { name: 'Escapades européennes', description: 'Repérages ville par ville.', color: '#D9C6A6' },
      { name: 'Carnet Portugal', description: 'Le meilleur de Lisbonne à Porto.', color: '#C98A4B' },
    ],
    collections: [
      {
        name: 'Lisbonne essentielle',
        description: 'Dormir, manger et flâner à Lisbonne.',
        project: 'Carnet Portugal',
        cover: '/collections/lisbonne-essentielle.jpg',
        links: [
          { title: 'Memmo Alfama Hotel', url: 'https://www.memmohotels.com/alfama', description: 'Boutique-hôtel avec terrasse sur les toits de l’Alfama.', sub: 'Hébergement' },
          { title: 'Time Out Market Lisboa', url: 'https://www.timeoutmarket.com/lisboa/', description: 'Halle gastronomique du Cais do Sodré.', sub: 'Restaurant' },
          { title: 'Miradouro da Senhora do Monte', url: 'https://www.visitlisboa.com/miradouro-senhora-do-monte', description: 'Le plus beau point de vue sur la ville.', sub: 'Lieu à voir' },
          { title: 'Tram 28 (itinéraire)', url: 'https://www.carris.pt/tram-28', description: 'Le tramway historique qui traverse les quartiers.', sub: 'Transport' },
        ],
      },
      {
        name: 'Porto en un week-end',
        description: 'Deux jours entre le Douro et les azulejos.',
        project: 'Carnet Portugal',
        cover: '/collections/porto-en-un-week-end.jpg',
        links: [
          { title: 'The Yeatman', url: 'https://www.the-yeatman-hotel.com/', description: 'Hôtel avec vue sur le Douro et cave à porto.', sub: 'Hébergement' },
          { title: 'Cantinho do Avillez Porto', url: 'https://www.cantinhodoavillez.pt/porto', description: 'La table signature de José Avillez.', sub: 'Restaurant' },
          { title: 'Livraria Lello', url: 'https://www.livrarialello.pt/', description: 'La librairie la plus photographiée du monde.', sub: 'Lieu à voir' },
          { title: 'Croisière des six ponts', url: 'https://www.douroacima.pt/six-bridges', description: 'Balade fluviale sur le Douro.', sub: 'Activité' },
        ],
      },
      {
        name: 'Refuges au bord de l’eau',
        description: 'Adresses les pieds dans l’eau, partout en Europe.',
        project: 'Escapades européennes',
        cover: '/collections/refuges-au-bord-de-leau.jpg',
        links: [
          { title: 'Il Pellicano (Toscane)', url: 'https://www.hotelilpellicano.com/', description: 'Institution balnéaire de l’Argentario.', sub: 'Hébergement' },
          { title: 'Les Roches Rouges (Var)', url: 'https://www.hotellesrochesrouges.com/', description: 'Hôtel design face à la Méditerranée.', sub: 'Hébergement' },
          { title: 'Grotta Palazzese (Pouilles)', url: 'https://www.grottapalazzese.it/', description: 'Restaurant dans une grotte marine.', sub: 'Restaurant' },
        ],
      },
    ],
  },
  {
    spec: 'style',
    email: 'demo-style@curio.test',
    username: 'curio_demo_style',
    displayName: 'Inès Mode',
    location: 'Paris, FR',
    bio: `Curatrice mode — pièces intemporelles, maisons et silhouettes. ${DEMO_MARKER}`,
    topic: 'style',
    avatar: '/curators/ines-mode.jpg',
    projects: [
      { name: 'Garde-robe capsule', description: 'Bâtir un vestiaire qui dure.', color: '#4A4550' },
    ],
    collections: [
      {
        name: 'Le vestiaire essentiel',
        description: 'Les pièces qui ne se démodent pas.',
        project: 'Garde-robe capsule',
        cover: '/collections/le-vestiaire-essentiel.jpg',
        links: [
          { title: 'Le trench Burberry', url: 'https://www.burberry.com/the-trench-coat/', description: 'La gabardine qui a fait la maison.' },
          { title: 'La marinière Saint James', url: 'https://www.saint-james.com/marinieres', description: 'Le tricot rayé breton, un classique.' },
          { title: 'Le mocassin Weston', url: 'https://www.jmweston.com/mocassin-180', description: 'Le 180, cousu main depuis 1946.' },
        ],
      },
      {
        name: 'Maisons à suivre',
        description: 'Marques et créateurs qui comptent.',
        project: 'Garde-robe capsule',
        cover: '/collections/maisons-a-suivre.jpg',
        links: [
          { title: 'Lemaire', url: 'https://www.lemaire.fr/', description: 'Le vestiaire tout en fluidité de Christophe Lemaire.' },
          { title: 'The Row', url: 'https://www.therow.com/', description: 'Le minimalisme luxe des sœurs Olsen.' },
          { title: 'Jacquemus', url: 'https://www.jacquemus.com/', description: 'Le soleil du Sud dans la mode française.' },
          { title: 'Officine Générale', url: 'https://www.officinegenerale.com/', description: 'Le tailoring parisien décontracté.' },
        ],
      },
    ],
  },
  {
    spec: 'design',
    email: 'demo-design@curio.test',
    username: 'curio_demo_design',
    displayName: 'Théo Design',
    location: 'Copenhague, DK',
    bio: `Curateur design — objets, intérieurs et sources d’inspiration. ${DEMO_MARKER}`,
    topic: 'design',
    avatar: '/curators/theo-design.jpg',
    projects: [
      { name: 'Objets du quotidien', description: 'Le beau qui sert tous les jours.', color: '#6A7B7A' },
      { name: 'Intérieurs de référence', description: 'Des pièces qui donnent le ton.', color: '#93AFA8' },
    ],
    collections: [
      {
        name: 'Icônes du mobilier',
        description: 'Les assises qui ont marqué le XXe siècle.',
        project: 'Intérieurs de référence',
        cover: '/collections/icones-du-mobilier.jpg',
        links: [
          { title: 'Egg Chair — Arne Jacobsen', url: 'https://www.fritzhansen.com/egg-chair', description: 'Le fauteuil-cocon de 1958, édité par Fritz Hansen.' },
          { title: 'Wishbone Chair — Wegner', url: 'https://www.carlhansen.com/wishbone-chair', description: 'La CH24, tressée main depuis 1950.' },
          { title: 'Chaise LC4 — Le Corbusier', url: 'https://www.cassina.com/lc4', description: 'La chaise longue basculante, éditée par Cassina.' },
        ],
      },
      {
        name: 'Objets bien dessinés',
        description: 'Petits objets, grande attention.',
        project: 'Objets du quotidien',
        cover: '/collections/objets-bien-dessines.jpg',
        links: [
          { title: 'Bouilloire 9093 — Michael Graves', url: 'https://www.alessi.com/9093', description: 'La bouilloire à l’oiseau siffleur, Alessi.' },
          { title: 'Lampe AJ — Arne Jacobsen', url: 'https://www.louispoulsen.com/aj-lamp', description: 'La lampe de table de 1960, Louis Poulsen.' },
          { title: 'Presse-agrumes Juicy Salif', url: 'https://www.alessi.com/juicy-salif', description: 'L’objet-sculpture de Philippe Starck.' },
        ],
      },
      {
        name: 'Sources d’inspiration',
        description: 'Où je regarde pour rester curieux.',
        project: 'Objets du quotidien',
        cover: '/collections/sources-dinspiration.jpg',
        links: [
          { title: 'Dezeen', url: 'https://www.dezeen.com/', description: 'L’actualité mondiale de l’architecture et du design.' },
          { title: 'Sight Unseen', url: 'https://www.sightunseen.com/', description: 'Le design émergent, côté indépendant.' },
        ],
      },
    ],
  },
  {
    spec: 'books',
    email: 'demo-books@curio.test',
    username: 'curio_demo_books',
    displayName: 'Adèle Norn',
    location: 'Bruxelles, BE',
    bio: `Curatrice littérature — romans qui marquent, essais qui éclairent et librairies qui comptent. ${DEMO_MARKER}`,
    topic: 'books',
    avatar: '/curators/adele-norn.jpg',
    projects: [
      { name: 'Bibliothèque idéale', description: 'Les livres qu’on relit.', color: '#8B6F47' },
    ],
    collections: [
      {
        name: 'Romans qui restent',
        description: 'Les histoires qu’on n’oublie pas.',
        project: 'Bibliothèque idéale',
        cover: '/collections/romans-qui-restent.jpg',
        links: [
          { title: 'L’Étranger — Albert Camus', url: 'https://www.gallimard.fr/Catalogue/GALLIMARD/Folio/Folio/L-Etranger', description: 'Le roman qui a défini l’absurde.' },
          { title: 'Beloved — Toni Morrison', url: 'https://www.penguinrandomhouse.com/books/175570/beloved-by-toni-morrison/', description: 'Prix Pulitzer, une hantise devenue classique.' },
          { title: 'Norwegian Wood — Haruki Murakami', url: 'https://www.penguinrandomhouse.com/books/79196/norwegian-wood-by-haruki-murakami/', description: 'Le roman qui a révélé Murakami en Occident.' },
        ],
      },
      {
        name: 'Librairies du monde',
        description: 'Les adresses qui donnent envie de lire.',
        project: 'Bibliothèque idéale',
        cover: '/collections/librairies-du-monde.jpg',
        links: [
          { title: 'Livraria Lello (Porto)', url: 'https://www.livrarialello.pt/', description: 'La librairie la plus photographiée du monde.' },
          { title: 'Shakespeare and Company (Paris)', url: 'https://shakespeareandcompany.com/', description: 'L’institution littéraire de la rive gauche.' },
          { title: 'El Ateneo Grand Splendid (Buenos Aires)', url: 'https://www.yenny-elateneo.com/', description: 'Une librairie installée dans un ancien théâtre.' },
        ],
      },
    ],
  },
  {
    spec: 'food',
    email: 'demo-food@curio.test',
    username: 'curio_demo_food',
    displayName: 'Nathan Reyes',
    location: 'Marseille, FR',
    bio: `Curateur food — tables qui comptent, produits bien sourcés et adresses de quartier. ${DEMO_MARKER}`,
    topic: 'food',
    avatar: '/curators/nathan-reyes.jpg',
    projects: [
      { name: 'Bonnes tables', description: 'Les adresses qui valent le détour.', color: '#C1694F' },
    ],
    collections: [
      {
        name: 'Tables de quartier',
        description: 'Les bonnes adresses du coin.',
        project: 'Bonnes tables',
        cover: '/collections/tables-de-quartier.jpg',
        links: [
          { title: 'Chez l’Épicier (Marseille)', url: 'https://www.chez-lepicier.fr/', description: 'Bistrot de quartier, produits du marché.' },
          { title: 'La Cantinetta (Marseille)', url: 'https://www.lacantinetta.fr/', description: 'Cuisine italienne simple et généreuse.' },
          { title: 'Le Bistrot des Voisins', url: 'https://www.lebistrotdesvoisins.fr/', description: 'La table de quartier qui ne désemplit pas.' },
        ],
      },
      {
        name: 'Produits bien sourcés',
        description: 'Ce qu’on met dans l’assiette.',
        project: 'Bonnes tables',
        cover: '/collections/produits-bien-sources.jpg',
        links: [
          { title: 'Huile d’olive Château d’Estoublon', url: 'https://www.chateaudestoublon.com/', description: 'Huile d’olive AOP des Alpilles.' },
          { title: 'Fromagerie Quatrehomme', url: 'https://www.cremerie-quatrehomme.fr/', description: 'Une des meilleures fromageries de Paris.' },
          { title: 'Poissonnerie du Marché des Capucins', url: 'https://www.marchedescapucins.fr/', description: 'Poisson du jour, criée locale.' },
        ],
      },
    ],
  },
]

// ── helpers ───────────────────────────────────────────────────────────────
const log = (...a) => console.log(...a)

/** url_normalized: lowercase host+path, no trailing slash, no query/fragment.
 * Deterministic so re-runs upsert the same canonical link (mirrors the app's
 * normalize intent closely enough for seed identity — the real normalizer is in
 * lib/links/normalize.ts; here we only need a STABLE unique key). */
function normalizeUrl(raw) {
  try {
    const u = new URL(raw)
    let path = u.pathname.replace(/\/+$/, '')
    return `${u.host.toLowerCase()}${path.toLowerCase()}`
  } catch {
    return raw.toLowerCase()
  }
}

/** Find an existing demo auth user by email (Admin API has no getByEmail; page
 * through listUsers — fine for a tiny demo cohort). */
async function findAuthUserByEmail(email) {
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
    page++
  }
}

// ── seed one curator ─────────────────────────────────────────────────────────
async function seedCurator(c, subcatIdByLabel) {
  // 1. account (idempotent: reuse if the email already exists)
  let authUser = await findAuthUserByEmail(c.email)
  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: c.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: c.displayName },
    })
    if (error) throw new Error(`createUser(${c.email}) failed: ${error.message}`)
    authUser = data.user
    log(`  + auth user ${c.email} (${authUser.id})`)
  } else {
    log(`  = auth user ${c.email} exists (${authUser.id})`)
  }
  const uid = authUser.id

  // The provisioning trigger runs on insert; on a brand-new account the
  // public.users row may not be visible for a beat. Poll briefly.
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.from('users').select('id').eq('id', uid).maybeSingle()
    if (data) break
    await new Promise((r) => setTimeout(r, 300))
  }

  // 2. real profile + founding-curator flag (bypasses RLS via service role)
  const { error: upErr } = await admin
    .from('users')
    .update({
      username: c.username,
      display_name: c.displayName,
      bio: c.bio,
      location: c.location,
      avatar_url: c.avatar ?? null,
      is_founding_curator: true,
      onboarding_completed: true,
    })
    .eq('id', uid)
  if (upErr) throw new Error(`update profile(${c.username}) failed: ${upErr.message}`)

  // Promote the plan to founding_curator so the PlanBadge reads correctly
  // (trigger seeded 'free'). Upsert-by-user_id since plans.user_id is unique.
  const { error: planErr } = await admin
    .from('plans')
    .update({ plan_type: 'founding_curator' })
    .eq('user_id', uid)
  if (planErr) log(`  ! plan promote warning: ${planErr.message}`)

  // 3. projects (idempotent on (owner_id, name))
  const projectIdByName = {}
  for (const p of c.projects) {
    const { data: existing } = await admin
      .from('projects')
      .select('id')
      .eq('owner_id', uid)
      .eq('name', p.name)
      .maybeSingle()
    if (existing) {
      projectIdByName[p.name] = existing.id
      continue
    }
    const { data, error } = await admin
      .from('projects')
      .insert({ owner_id: uid, name: p.name, description: p.description, color: p.color })
      .select('id')
      .single()
    if (error) throw new Error(`insert project(${p.name}) failed: ${error.message}`)
    projectIdByName[p.name] = data.id
  }

  // 4. collections + links
  for (const col of c.collections) {
    // cover: static illustrated asset under public/collections/ (2026-08-30 —
    // no Storage upload needed, next/image serves local public/ files directly).
    const coverUrl = col.cover ?? null

    // collection (idempotent on (owner_id, name))
    let collectionId
    const { data: existingCol } = await admin
      .from('collections')
      .select('id')
      .eq('owner_id', uid)
      .eq('name', col.name)
      .maybeSingle()
    if (existingCol) {
      collectionId = existingCol.id
      // keep cover/public/project in sync on re-run
      await admin
        .from('collections')
        .update({
          is_public: true,
          cover_image_url: coverUrl,
          project_id: projectIdByName[col.project] ?? null,
        })
        .eq('id', collectionId)
    } else {
      const { data, error } = await admin
        .from('collections')
        .insert({
          owner_id: uid,
          project_id: projectIdByName[col.project] ?? null,
          topic_id: c.topic,
          name: col.name,
          description: col.description,
          cover_image_url: coverUrl,
          is_public: true,
        })
        .select('id')
        .single()
      if (error) throw new Error(`insert collection(${col.name}) failed: ${error.message}`)
      collectionId = data.id
    }

    // links (canonical, upsert on url_normalized) + user_links (the save)
    for (const l of col.links) {
      const urlNorm = normalizeUrl(l.url)
      // upsert canonical link
      const { data: link, error: linkErr } = await admin
        .from('links')
        .upsert(
          {
            url_normalized: urlNorm,
            url_first_origin: l.url,
            title: l.title.slice(0, 100),
            description: l.description?.slice(0, 300) ?? null,
          },
          { onConflict: 'url_normalized' },
        )
        .select('id')
        .single()
      if (linkErr) throw new Error(`upsert link(${l.title}) failed: ${linkErr.message}`)

      const subId = l.sub ? (subcatIdByLabel[c.topic]?.[l.sub] ?? null) : null

      // user_link: idempotent on the natural tuple (user, link, collection).
      const { data: existingUl } = await admin
        .from('user_links')
        .select('id')
        .eq('user_id', uid)
        .eq('link_id', link.id)
        .eq('collection_id', collectionId)
        .maybeSingle()
      if (existingUl) {
        await admin
          .from('user_links')
          .update({ topic_id: c.topic, subcategory_id: subId })
          .eq('id', existingUl.id)
        continue
      }
      const { error: ulErr } = await admin.from('user_links').insert({
        user_id: uid,
        link_id: link.id,
        collection_id: collectionId,
        topic_id: c.topic,
        subcategory_id: subId,
        url_origin: l.url,
      })
      if (ulErr) throw new Error(`insert user_link(${l.title}) failed: ${ulErr.message}`)
    }
    log(`    · collection "${col.name}" (${col.links.length} links)${col.cover ? ' [cover]' : ' [fallback]'}`)
  }
}

// ── load Travel sub-category ids (by label) once ─────────────────────────────
async function loadSubcategories() {
  const { data, error } = await admin
    .from('link_subcategories')
    .select('id, topic_id, label')
  if (error) throw new Error(`load subcategories failed: ${error.message}`)
  const byTopic = {}
  for (const row of data ?? []) {
    byTopic[row.topic_id] = byTopic[row.topic_id] ?? {}
    byTopic[row.topic_id][row.label] = row.id
  }
  return byTopic
}

// ── verify ────────────────────────────────────────────────────────────────
async function verify() {
  log('\nVerification (demo curators + content present):')
  let allOk = true
  for (const c of CURATORS) {
    const auth = await findAuthUserByEmail(c.email)
    if (!auth) {
      log(`  FAIL  ${c.email} — no auth user`)
      allOk = false
      continue
    }
    const { data: u } = await admin
      .from('users')
      .select('username, display_name, is_founding_curator')
      .eq('id', auth.id)
      .maybeSingle()
    const { count: projCount } = await admin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.id)
    const { data: cols } = await admin
      .from('collections')
      .select('id, name, is_public, cover_image_url, links_count')
      .eq('owner_id', auth.id)
    const publicCols = (cols ?? []).filter((x) => x.is_public)
    const withCover = (cols ?? []).filter((x) => x.cover_image_url).length
    const totalLinks = (cols ?? []).reduce((s, x) => s + (x.links_count ?? 0), 0)

    const ok =
      Boolean(u?.is_founding_curator) &&
      u?.username === c.username &&
      (projCount ?? 0) >= 1 &&
      publicCols.length >= 2 &&
      withCover >= 1 &&
      totalLinks >= 5
    allOk = allOk && ok
    log(
      `  ${ok ? 'PASS' : 'FAIL'}  @${u?.username ?? '?'} — founding=${u?.is_founding_curator} ` +
        `projects=${projCount} publicCollections=${publicCols.length} ` +
        `withCover=${withCover} links(sum)=${totalLinks}`,
    )
    for (const col of cols ?? []) {
      log(`          · ${col.name} — public=${col.is_public} cover=${col.cover_image_url ? 'yes' : 'no'} links=${col.links_count}`)
    }
  }
  log(allOk ? '\nAll demo curators present and complete.' : '\nSome checks FAILED.')
  return allOk
}

// ── purge ───────────────────────────────────────────────────────────────────
// Order matters (memory: deleteaccount-gotrue-500-fixb): remove the public.users
// row FIRST (which cascades projects/collections/user_links via FK on delete
// cascade), then auth.admin.deleteUser. Also delete the account's storage covers.
async function purge() {
  log('\nPurging demo curators…')
  for (const c of CURATORS) {
    const auth = await findAuthUserByEmail(c.email)
    if (!auth) {
      log(`  = ${c.email} — nothing to purge`)
      continue
    }
    const uid = auth.id

    // storage covers under <uid>/
    const { data: objs } = await admin.storage.from('collection-covers').list(uid)
    if (objs && objs.length) {
      const paths = objs.map((o) => `${uid}/${o.name}`)
      const { error } = await admin.storage.from('collection-covers').remove(paths)
      if (error) log(`  ! cover remove warning: ${error.message}`)
      else log(`  - removed ${paths.length} cover object(s)`)
    }

    // public.users first → cascades projects/collections/user_links
    const { error: delUserErr } = await admin.from('users').delete().eq('id', uid)
    if (delUserErr) log(`  ! delete public.users warning: ${delUserErr.message}`)

    // then the auth account
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(uid)
    if (delAuthErr) throw new Error(`deleteUser(${c.email}) failed: ${delAuthErr.message}`)
    log(`  - purged ${c.email} (${uid})`)
  }
  log('Purge complete.')
}

// ── main ─────────────────────────────────────────────────────────────────────
try {
  if (MODE === 'purge') {
    await purge()
  } else if (MODE === 'verify') {
    const ok = await verify()
    process.exit(ok ? 0 : 1)
  } else {
    log(`Seeding demo curators into ${url} …`)
    const subcatIdByLabel = await loadSubcategories()
    for (const c of CURATORS) {
      log(`\n${c.displayName} (@${c.username}, ${c.topic}):`)
      await seedCurator(c, subcatIdByLabel)
    }
    const ok = await verify()
    process.exit(ok ? 0 : 1)
  }
} catch (err) {
  console.error('\nFATAL:', err.message)
  process.exit(3)
}
