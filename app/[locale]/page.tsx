import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { buildMetadata } from '@/lib/seo/metadata'
import { checkInvitationToken } from '@/lib/auth/invitation'
import { AccentText, ButtonLink, CollectionCard } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'
import {
  getPublicCollections,
  getPublicCurators,
  getPublicTopics,
} from '@/lib/public/data'
import { TopicIcon } from '@/components/brand/topic-icon'

type PageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Landing' })
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    siteName: meta('siteName'),
    path: '',
  })
}

const FEATURES = [
  { key: 'collect', color: 'bg-violet/10 text-violet', symbol: '♡' },
  { key: 'organize', color: 'bg-[#EEF2E7] text-[#728A53]', symbol: '♧' },
  { key: 'discover', color: 'bg-[#FBF1DD] text-[#D6A24E]', symbol: '◎' },
  { key: 'keep', color: 'bg-[#FBEAEA] text-[#D27B7B]', symbol: '♡' },
] as const

// Hero orbit — simplified, viewport-proof geometry (see comment at the call
// site). Fixed pixel radius, 6 topics evenly spaced at 60° starting from the
// top, computed once with plain trig instead of reference-measured percentages.
//
// 2026-08-26: topic photos replaced with the same icon system already used on
// My Space and Explore (Badge + TopicIcon, lib/public/data getPublicTopics) —
// real Topic rows (id/label/icon), not decorative stock photos, so the same
// visual language reads consistently across the whole product. Angles/order
// unchanged from the previous photo version; these 6 ids are a fixed pick of
// the 10 real Core Topics (the other 4 — Beauty, Wellness, Design,
// Photography — just don't fit a 6-node ring).
const ORBIT_RADIUS = 112
const ORBIT_BOX = ORBIT_RADIUS * 2 + 140 // room for the 60px node + its two-line label

const ORBIT_TOPIC_ANGLES = [
  { id: 'travel', angle: 0 },
  { id: 'books', angle: 60 },
  { id: 'ideas', angle: 120 },
  { id: 'food', angle: 180 },
  { id: 'culture', angle: 240 },
  { id: 'style', angle: 300 },
] as const

// Same literal bg-badge-*/text-badge-* pairs as components/ui/badge.tsx,
// kept local (compact circular icon chip, not a pill — different enough
// markup that reusing <Badge> directly doesn't fit) rather than reached into.
const ORBIT_TINT: Record<(typeof ORBIT_TOPIC_ANGLES)[number]['id'], string> = {
  travel: 'bg-badge-travel/15',
  books: 'bg-badge-books/15',
  ideas: 'bg-badge-ideas/15',
  food: 'bg-badge-food/15',
  culture: 'bg-badge-culture/15',
  style: 'bg-badge-style/15',
}
const ORBIT_ICON_COLOR: Record<(typeof ORBIT_TOPIC_ANGLES)[number]['id'], string> = {
  travel: 'text-badge-travel',
  books: 'text-badge-books',
  ideas: 'text-badge-ideas',
  food: 'text-badge-food',
  culture: 'text-badge-culture',
  style: 'text-badge-style',
}

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('Landing')

  const tokenState = await checkInvitationToken(token)
  const signupHref =
    tokenState === 'valid' ? `/signup?token=${token}` : '/signup'

  const collections = await getPublicCollections(5)
  const socialProofCurators = await getPublicCurators(4)
  const allTopics = await getPublicTopics(locale)

  // Join the fixed 6-node ring layout to real topic rows (label/icon come
  // from the DB, never hardcoded copy) — a topic missing from the result
  // (shouldn't happen, the 10 Core Topics are seeded) is simply skipped
  // rather than crashing the hero on a data hiccup.
  const orbitTopics = ORBIT_TOPIC_ANGLES.flatMap(({ id, angle }) => {
    const topic = allTopics.find((t) => t.id === id)
    if (!topic) return []
    const radians = (angle * Math.PI) / 180
    return [
      {
        ...topic,
        x: Math.round(ORBIT_RADIUS * Math.sin(radians)),
        y: Math.round(-ORBIT_RADIUS * Math.cos(radians)),
      },
    ]
  })

  const content = (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden" style={{ paddingTop: 86 }}>
        {/* Full-bleed constellation layer — spans the header band too (bleeds
            upward by the header's 86px height) so header and hero read as one
            continuous field, mockup-exact (no seam at the nav line). */}
        <svg
          className="pointer-events-none absolute inset-x-0 z-0 w-full"
          style={{ top: -86, height: 'calc(100% + 86px)' }}
          viewBox="0 0 1280 484"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          {/* Constellation lines — scattered across the full width, header
              through hero, left edge (under the logo) to right edge (under
              Sign up). */}
          <line x1="60" y1="30" x2="95" y2="55" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.5" />
          <line x1="95" y1="55" x2="80" y2="90" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.4" />
          <line x1="150" y1="20" x2="185" y2="45" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.35" />
          <line x1="230" y1="60" x2="260" y2="35" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.3" />
          <line x1="950" y1="25" x2="985" y2="50" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.4" />
          <line x1="985" y1="50" x2="1020" y2="30" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.4" />
          <line x1="1020" y1="30" x2="1050" y2="60" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.35" />
          <line x1="1100" y1="15" x2="1130" y2="40" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.35" />
          <line x1="1180" y1="55" x2="1210" y2="30" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.3" />
          <line x1="440" y1="100" x2="470" y2="130" stroke="#D9D8DE" strokeWidth="0.6" opacity="0.35" />
          <line x1="780" y1="105" x2="810" y2="135" stroke="#D9D8DE" strokeWidth="0.6" opacity="0.35" />
          {/* Constellation dots — full width, denser than a scoped orbit motif. */}
          <circle cx="60" cy="30" r="2" fill="#6C5CE7" opacity="0.55" />
          <circle cx="95" cy="55" r="1.6" fill="#E6A06A" opacity="0.5" />
          <circle cx="80" cy="90" r="1.6" fill="#D9D8DE" opacity="0.45" />
          <circle cx="150" cy="20" r="1.6" fill="#6C5CE7" opacity="0.4" />
          <circle cx="185" cy="45" r="1.4" fill="#E6A06A" opacity="0.35" />
          <circle cx="230" cy="60" r="1.6" fill="#D9D8DE" opacity="0.35" />
          <circle cx="260" cy="35" r="1.4" fill="#6C5CE7" opacity="0.3" />
          <circle cx="330" cy="15" r="1.6" fill="#E6A06A" opacity="0.3" />
          <circle cx="380" cy="50" r="1.4" fill="#D9D8DE" opacity="0.3" />
          <circle cx="440" cy="100" r="1.6" fill="#6C5CE7" opacity="0.3" />
          <circle cx="470" cy="130" r="1.4" fill="#E6A06A" opacity="0.25" />
          <circle cx="780" cy="105" r="1.6" fill="#E6A06A" opacity="0.3" />
          <circle cx="810" cy="135" r="1.4" fill="#6C5CE7" opacity="0.25" />
          <circle cx="950" cy="25" r="1.8" fill="#6C5CE7" opacity="0.45" />
          <circle cx="985" cy="50" r="1.6" fill="#E6A06A" opacity="0.4" />
          <circle cx="1020" cy="30" r="1.6" fill="#D9D8DE" opacity="0.4" />
          <circle cx="1050" cy="60" r="1.4" fill="#6C5CE7" opacity="0.35" />
          <circle cx="1100" cy="15" r="1.6" fill="#E6A06A" opacity="0.35" />
          <circle cx="1130" cy="40" r="1.4" fill="#D9D8DE" opacity="0.3" />
          <circle cx="1180" cy="55" r="1.6" fill="#6C5CE7" opacity="0.3" />
          <circle cx="1210" cy="30" r="1.4" fill="#E6A06A" opacity="0.35" />
          <circle cx="1245" cy="70" r="1.6" fill="#D9D8DE" opacity="0.3" />
          <circle cx="30" cy="150" r="1.6" fill="#E6A06A" opacity="0.3" />
          <circle cx="70" cy="260" r="1.8" fill="#6C5CE7" opacity="0.3" />
          <circle cx="120" cy="340" r="1.4" fill="#D9D8DE" opacity="0.3" />
          <circle cx="1180" cy="220" r="1.6" fill="#6C5CE7" opacity="0.3" />
          <circle cx="1220" cy="300" r="1.4" fill="#E6A06A" opacity="0.3" />
          <circle cx="1160" cy="380" r="1.6" fill="#D9D8DE" opacity="0.3" />
        </svg>

        {/* Single relative 1280-wide canvas — copy, orbit and photo are all
            positioned against these SAME coordinates (measured directly off
            01-curio-reference-4x.png, 1280×853), not split into separate grid
            columns with their own coordinate systems (that's what silently
            distorted the orbit earlier). */}
        <div className="relative z-10 mx-auto min-h-[398px] max-w-[1280px]">
          {/* Copy + CTAs — normal flow, capped width, flat 24px left offset
              (2026-08-25: dropped the lg:pl-3xl bump, shifted further left
              per Jay's annotated screenshot), same token as the
              header/collections/feature bar below. */}
          <div className="absolute inset-y-0 left-0 z-10 flex max-w-[460px] flex-col justify-center gap-sm py-md pl-lg sm:py-lg">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-violet">
              {t('eyebrow')}
            </span>

            <AccentText
              before={t('titleBefore')}
              accent={t('titleAccent')}
              accentColor="inherit"
              size="display"
              as="h1"
              className="max-w-[330px] text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08]"
            />

            <p className="max-w-sm font-sans text-[13px] leading-relaxed text-[#444]">
              {t('subtitle')}
            </p>

            {tokenState === 'invalid' ? (
              <p
                role="status"
                className="max-w-sm font-sans text-body-small text-foreground/60"
              >
                {t('invalidToken')}
              </p>
            ) : null}

            <div className="mt-xs flex flex-nowrap items-center gap-sm">
              <ButtonLink
                href={signupHref}
                size="small"
                className="whitespace-nowrap"
                iconRight={<ArrowRight className="size-4" />}
              >
                {t('ctaBuild')}
              </ButtonLink>
              <ButtonLink
                href="/explore"
                variant="secondary"
                size="small"
                className="whitespace-nowrap"
                iconRight={<ArrowRight className="size-4" />}
              >
                {t('ctaExplore')}
              </ButtonLink>
            </div>

            {/* Founding Curators social proof — real curator avatars (not
                fake gradient placeholders), same "use the real data" call as
                the collection covers below. Falls back to a gradient chip
                for any curator without an avatar_url yet. */}
            <div className="mt-sm flex items-center gap-sm">
              <div className="flex -space-x-2" aria-hidden>
                {(socialProofCurators.length > 0
                  ? socialProofCurators
                  : [null, null, null, null]
                ).map((curator, i) => {
                  const fallbackGradients = [
                    'from-[#D9C6A6] to-[#C98A4B]',
                    'from-[#CFC3FF] to-[#785CFF]',
                    'from-[#93AFA8] to-[#6A7B7A]',
                    'from-[#D9AFAE] to-[#C1694F]',
                  ]
                  return curator?.avatarUrl ? (
                    <span
                      key={curator.id}
                      className="relative inline-block size-8 overflow-hidden rounded-full ring-2 ring-white"
                    >
                      <Image
                        src={curator.avatarUrl}
                        alt={curator.displayName}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </span>
                  ) : (
                    <span
                      key={curator?.id ?? i}
                      className={`inline-block size-8 rounded-full bg-gradient-to-br ring-2 ring-white ${fallbackGradients[i % fallbackGradients.length]}`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-[12px] font-medium text-foreground/80">
                  {t('socialProof')}
                </span>
                <span className="font-sans text-[10px] text-foreground/50">
                  {t('socialProofSub')}
                </span>
              </div>
            </div>
          </div>

          {/* Centre: "You" + Topic orbit — simplified rebuild (2026-08-24).
              The mockup-exact version kept breaking (positions/sizes off)
              because it depended on percentages resolving correctly against
              a container whose own aspect ratio shifts with viewport width —
              fragile by construction. This version drops that dependency
              entirely: one fixed-size square (ORBIT_BOX), 6 topics at even
              60° angles around a fixed pixel radius, computed with plain
              trig. Not a copy of the reference's exact (slightly irregular)
              geometry — the brief here is "You in the centre, your topics
              around you," reproduced cleanly and predictably at any
              viewport, not chased pixel-for-pixel. */}
          <div
            className="pointer-events-none absolute left-[53%] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
            style={{ width: ORBIT_BOX, height: ORBIT_BOX }}
          >
            {/* Single orbit ring, sized to the same radius the nodes sit on. */}
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/50"
              style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }}
            />

            {/* "You" centre node */}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <span
                className="flex size-[76px] items-center justify-center rounded-full bg-white font-sans text-[13px] font-medium text-foreground ring-1 ring-border/30"
                style={{
                  boxShadow:
                    '0 0 0 14px rgba(120,92,255,0.06), 0 0 0 28px rgba(120,92,255,0.03), 0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                You
              </span>
            </div>

            {/* Topic nodes — evenly spaced at 60° around ORBIT_RADIUS, offset
                computed in orbitTopics above (plain sin/cos, no percentage
                math). Icon + tint come from the real Topic row (same
                TopicIcon/badge-* system as My Space and Explore), not a
                stock photo — no collection count shown here: every Core
                Topic reads 0 public collections today, and this ring is a
                concept illustration, not a live stat widget. */}
            {orbitTopics.map((topic) => (
              <div
                key={topic.id}
                className="absolute left-1/2 top-1/2 flex flex-col items-center gap-xs"
                style={{ transform: `translate(calc(-50% + ${topic.x}px), calc(-50% + ${topic.y}px))` }}
              >
                <div
                  className={`flex size-[60px] items-center justify-center rounded-full border border-border/60 ${ORBIT_TINT[topic.id as keyof typeof ORBIT_TINT]}`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <TopicIcon
                    name={topic.icon}
                    className={`size-6 ${ORBIT_ICON_COLOR[topic.id as keyof typeof ORBIT_ICON_COLOR]}`}
                  />
                </div>
                <span className="whitespace-nowrap font-sans text-[11px] font-medium text-foreground/80">
                  {topic.label}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Right: hero photo — a sibling of the 1280-capped block above, not
            a child of it, so it can bleed to the TRUE viewport edge on wide
            screens instead of stopping at a gutter once the viewport exceeds
            1280px. Left edge = min(70.31%, 50%+260px): below 1280px viewport
            that's a plain 70.31% (== the reference's 900/1280 bbox, no
            centering offset yet); above 1280px the 1280-block is centered, so
            "50% of viewport + 260px" is the fixed distance from that block's
            center to its own x=900 mark — using whichever is smaller keeps
            the photo's left edge locked to the content block while its right
            edge always reaches true right:0 (full bleed, no white band). */}
        <div
          className="absolute inset-y-0 right-0 hidden overflow-hidden lg:block"
          style={{ left: 'min(70.31%, calc(50% + 260px))' }}
        >
          <Image
            src="/landing/hero-photo.jpg"
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: 'center' }}
            sizes="30vw"
            priority
          />
          {/* Left fade into background */}
          <div
            className="absolute inset-y-0 left-0 w-28"
            style={{
              background:
                'linear-gradient(to right, rgb(var(--background)), transparent)',
            }}
          />
        </div>
      </section>

      {/* ── Collections showcase ───────────────────────────────────── */}
      <section className="bg-[#FAF9F5]">
        {/* Same flat px-lg as the header/hero copy/feature bar, nested inside
            the width-capped block so it lines up with them. */}
        <div className="mx-auto w-full max-w-[1280px]">
        <div className="flex w-full flex-col gap-md px-lg py-md sm:flex-row sm:items-start sm:gap-lg">
          {/* Left: text */}
          <div className="flex w-full shrink-0 flex-col gap-xs sm:w-[220px] sm:pt-sm">
            <h2 className="font-serif text-[28px] leading-[1.15] text-foreground">
              {t('universesBefore')}
              <em className="italic text-violet">{t('universesAccent')}</em>
            </h2>
            <p className="font-sans text-[11px] leading-relaxed text-[#666]">
              {t('universesSubtitle')}
            </p>
            <Link
              href="/explore"
              className="mt-xs inline-flex items-center gap-xs font-sans text-[11px] font-medium text-violet transition-colors hover:opacity-80"
            >
              {t('universesCta')}
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>

          {/* Right: real public collections (empty today → empty state).
              Same CollectionCard (variant="overlay") as Home's "Picked for
              you" — badge, title, description, owner avatar + name, save
              count — so a collection reads identically everywhere instead of
              the landing having its own stripped-down look (2026-08-27). */}
          {collections.length > 0 ? (
            <div className="relative flex-1">
              <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
                {collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
                  >
                    <CollectionCard
                      variant="overlay"
                      title={col.title}
                      topic={col.topic}
                      cover={col.cover ?? undefined}
                      mosaic={col.mosaic}
                      description={col.description ?? undefined}
                      owner={{
                        name: col.owner.name,
                        avatar: col.owner.avatar ?? undefined,
                      }}
                      linksCount={col.linksCount}
                    />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-xs py-lg text-center">
              <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-violet/60">
                {t('universesEmptyTag')}
              </span>
              <p className="font-sans text-[13px] text-foreground/60">
                {t('universesEmptyTitle')}
              </p>
            </div>
          )}
        </div>
        </div>
      </section>

      {/* ── Feature bar ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1280px] px-lg py-lg">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, color, symbol }) => (
            <div key={key} className="flex items-start gap-sm">
              <span
                className={`flex size-[42px] shrink-0 items-center justify-center rounded-full text-[19px] ${color}`}
              >
                {symbol}
              </span>
              <div className="flex flex-col gap-[2px]">
                <span className="font-sans text-[12px] font-medium text-foreground">
                  {t(`values.${key}.title`)}
                </span>
                <span className="font-sans text-[10px] leading-snug text-[#666]">
                  {t(`values.${key}.body`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )

  return (
    <PublicConnectedShell
      locale={locale}
      anon={<PublicShell transparentHeader>{content}</PublicShell>}
    >
      {content}
    </PublicConnectedShell>
  )
}
