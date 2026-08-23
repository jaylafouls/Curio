import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { buildMetadata } from '@/lib/seo/metadata'
import { checkInvitationToken } from '@/lib/auth/invitation'
import { AccentText, ButtonLink } from '@/components/ui'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import { PublicConnectedShell } from '@/components/app/public-connected-shell'
import { PublicShell } from '@/components/public/public-shell'

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

const TOPIC_VIGNETTES = [
  { src: '/landing/travel.jpg', label: 'Travel' },
  { src: '/landing/books.jpg', label: 'Books' },
  { src: '/landing/style.jpg', label: 'Style' },
  { src: '/landing/culture.jpg', label: 'Culture' },
  { src: '/landing/ideas.jpg', label: 'Ideas' },
  { src: '/landing/food.jpg', label: 'Food' },
] as const

const SHOWCASE_CARDS = [
  { src: '/landing/tokyo.jpg', title: 'Tokyo by Locals' },
  { src: '/landing/escapes.jpg', title: 'Hidden Escapes' },
  { src: '/landing/books-card.jpg', title: 'Books That Stay' },
  { src: '/landing/food-card.jpg', title: 'Culinary Notes' },
  { src: '/landing/style-card.jpg', title: 'Timeless Style' },
] as const

const FEATURES = [
  { key: 'collect', color: 'bg-violet/10 text-violet', symbol: '♡' },
  { key: 'organize', color: 'bg-[#EEF2E7] text-[#728A53]', symbol: '♧' },
  { key: 'discover', color: 'bg-[#FBF1DD] text-[#D6A24E]', symbol: '◎' },
  { key: 'keep', color: 'bg-[#FBEAEA] text-[#D27B7B]', symbol: '♡' },
] as const

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('Landing')

  const tokenState = await checkInvitationToken(token)
  const signupHref =
    tokenState === 'valid' ? `/signup?token=${token}` : '/signup'

  const content = (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden">
        <div className="mx-auto grid min-h-[398px] max-w-[1280px] grid-cols-1 lg:grid-cols-[34%_36%_30%]">
          {/* Left: copy + CTAs */}
          <div className="flex flex-col gap-sm px-lg pt-md pb-md sm:pt-lg">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-violet">
              {t('eyebrow')}
            </span>

            <AccentText
              before={t('titleBefore')}
              accent={t('titleAccent')}
              size="display"
              as="h1"
              className="text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08]"
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

            <div className="mt-xs flex items-center gap-sm">
              <ButtonLink
                href={signupHref}
                iconRight={<ArrowRight className="size-4" />}
              >
                {t('ctaBuild')}
              </ButtonLink>
              <ButtonLink
                href="/explore"
                variant="secondary"
                iconRight={<ArrowRight className="size-4" />}
              >
                {t('ctaExplore')}
              </ButtonLink>
            </div>

            {/* Founding Curators social proof */}
            <div className="mt-sm flex items-center gap-sm">
              <div className="flex -space-x-2" aria-hidden>
                {[
                  'from-[#D9C6A6] to-[#C98A4B]',
                  'from-[#CFC3FF] to-[#785CFF]',
                  'from-[#93AFA8] to-[#6A7B7A]',
                  'from-[#D9AFAE] to-[#C1694F]',
                  'from-[#E0DBB8] to-[#8B6F47]',
                ].map((gradient, i) => (
                  <span
                    key={i}
                    className={`inline-block size-8 rounded-full bg-gradient-to-br ring-2 ring-white ${gradient}`}
                  />
                ))}
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

          {/* Centre: "You" + Topic vignettes orbit */}
          <div className="relative hidden lg:block">
            {/* Network lines — decorative SVG */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 400 400"
              fill="none"
              aria-hidden
            >
              <ellipse cx="200" cy="190" rx="140" ry="110" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.6" />
              <ellipse cx="200" cy="190" rx="90" ry="70" stroke="#D9D8DE" strokeWidth="0.8" opacity="0.4" />
            </svg>

            {/* "You" centre node */}
            <div className="absolute left-1/2 top-[46%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <span className="flex size-[72px] items-center justify-center rounded-full bg-white font-sans text-[13px] font-medium text-foreground shadow-md ring-1 ring-violet/10">
                You
              </span>
            </div>

            {/* Topic vignettes positioned around the orbit */}
            {TOPIC_VIGNETTES.map((topic, i) => {
              const angle = (i / TOPIC_VIGNETTES.length) * 2 * Math.PI - Math.PI / 2
              const rx = 40
              const ry = 36
              const cx = 50 + rx * Math.cos(angle)
              const cy = 46 + ry * Math.sin(angle)
              return (
                <div
                  key={topic.label}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[2px]"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                >
                  <div className="relative size-[54px] overflow-hidden rounded-full border border-border/60 shadow-sm">
                    <Image
                      src={topic.src}
                      alt={topic.label}
                      fill
                      className="object-cover"
                      sizes="54px"
                    />
                  </div>
                  <span className="whitespace-nowrap font-sans text-[11px] font-medium text-foreground/80">
                    {topic.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Right: hero photo */}
          <div className="relative hidden min-h-[398px] overflow-hidden lg:block">
            <Image
              src="/landing/hero-photo.jpg"
              alt=""
              fill
              className="object-cover object-center"
              sizes="384px"
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
        </div>
      </section>

      {/* ── Collections showcase ───────────────────────────────────── */}
      <section className="bg-[#FAF9F5]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-md px-lg py-md sm:flex-row sm:items-start sm:gap-lg">
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

          {/* Right: showcase cards row */}
          <div className="grid flex-1 grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
            {SHOWCASE_CARDS.map((card) => (
              <div
                key={card.title}
                className="relative h-[180px] overflow-hidden rounded-[10px] shadow-md"
              >
                <Image
                  src={card.src}
                  alt={card.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 170px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-sm pb-sm pt-lg">
                  <span className="font-serif text-[14px] leading-tight text-white">
                    {card.title}
                  </span>
                </div>
              </div>
            ))}
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
      anon={<PublicShell>{content}</PublicShell>}
    >
      {content}
    </PublicConnectedShell>
  )
}
