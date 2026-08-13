import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { getPublicCollectionBySlug } from '@/lib/collections/data'
import { CollectionDetailBody } from '@/components/app/collection-detail-body'
import { CollectionOwnerOverlay } from '@/components/app/collection-owner-overlay'
import { CollectionFollowButton } from '@/components/app/collection-follow-button'
import { CollectionPrivateClient } from '@/components/app/collection-private-client'
import { CollectionConnectedShell } from '@/components/app/collection-connected-shell'

/**
 * /[locale]/collections/[id] — the public collection page (spec §8.7 / §10).
 *
 * The route param is named `id` for historical reasons but is resolved by SLUG
 * (collections.slug, migration 0008) — the stable, human-readable public URL the
 * grids link to and the sitemap indexes (brief rule 1, URL stability).
 *
 * Two layers, per the brief ("garde le chemin anon/SEO/ISR existant pour les
 * crawlers, ajoute la vue propriétaire par-dessus"):
 *
 *  1. PUBLIC (this file): an anon, ISR-cached, crawler-visible render of a PUBLIC
 *     collection. Cookie-free, so the HTML is identical for everyone and safe to
 *     cache. The owner overlay mounts client-side over it and never contaminates
 *     the cache.
 *  2. PRIVATE fallback: when the anon read misses (a private collection), a
 *     client component fetches the owner-scoped detail after hydration and either
 *     renders it (for the owner) or 404s. Private content is never cached.
 */
export const revalidate = 3600

type PageProps = {
  params: Promise<{ locale: Locale; id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const meta = await getTranslations({ locale, namespace: 'Meta' })
  const collection = await getPublicCollectionBySlug(id)

  // Private / non-existent slug → generic noindex meta (the render either 404s or
  // shows the owner-only private view, neither of which should be indexed).
  if (!collection) {
    return buildMetadata({
      locale,
      title: meta('siteName'),
      description: meta('defaultDescription'),
      siteName: meta('siteName'),
      path: `/collections/${id}`,
      noindex: true,
    })
  }

  return buildMetadata({
    locale,
    title: `${collection.title} · ${meta('siteName')}`,
    description: collection.description ?? meta('defaultDescription'),
    siteName: meta('siteName'),
    path: `/collections/${collection.slug}`,
    images: collection.cover ? [collection.cover] : undefined,
  })
}

export default async function CollectionPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const collection = await getPublicCollectionBySlug(id)
  const t = await getTranslations({ locale, namespace: 'CollectionDetail' })

  // Public hit → ISR-cached crawler-visible body + client owner overlay on top.
  //
  // CollectionConnectedShell wraps the body: it renders nothing extra during the
  // server (cached) render and for anon visitors/crawlers, so this HTML stays
  // cookie-free and byte-identical to cache; for a signed-in visitor it mounts
  // the connected app frame (sidebar/top bar/bell/Save Flow) after hydration —
  // restoring app coherence without contaminating the cache (same client-only,
  // session-gated pattern as CollectionOwnerOverlay just below).
  if (collection) {
    return (
      <CollectionConnectedShell locale={locale}>
        <div className="pt-2xl">
          <CollectionOwnerOverlay collectionId={collection.id} locale={locale} />
          {/* Viewer follow toggle — client-side, keyed off the collection id, so
              the ISR body stays cookie-free. Renders nothing for the owner. */}
          {/* Reserve the follow button's height (h-9) so the article below never
              shifts when the client-side button mounts after hydration (CLS). */}
          <div className="mx-auto flex min-h-9 w-full max-w-4xl px-lg lg:px-2xl">
            <CollectionFollowButton collectionId={collection.id} />
          </div>
        </div>
        <CollectionDetailBody
          collection={collection}
          labels={{
            by: t('by', { name: collection.owner.name }),
            linksCount: t('linksCount', { count: collection.linksCount }),
            unsectioned: t('unsectioned'),
            emptyTitle: t('emptyTitle'),
            emptyBody: t('emptyBody'),
          }}
        />
      </CollectionConnectedShell>
    )
  }

  // Miss → private-collection owner fallback (or 404), fully client-side.
  return <CollectionPrivateClient slug={id} locale={locale} />
}
