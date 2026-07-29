import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Editorial data (spec §8.5) — Curio team content. The `editorial` table is
 * server-only (RLS-enabled, NO client policy — same class as brands/
 * analytics_events), so a public page must read it with the service-role admin
 * client from a Server Component. This module is `server-only` so that key can
 * never be pulled into a browser bundle.
 *
 * V1 wants 3-5 static quality pieces, but that content does not exist yet (a
 * rédactionnel task, flagged as out of dev scope). The query is real and
 * filters to published + current-locale rows, so it returns [] today and the
 * page renders its designed empty state — no fabricated articles. The moment a
 * row is published (status='published') it appears with no code change.
 */

export type EditorialPiece = {
  id: string
  slug: string
  title: string
  type: 'guide' | 'essay' | 'interview' | 'collection'
  cover: string | null
  authorName: string | null
  topicId: string | null
  publishedAt: string | null
}

export async function getPublishedEditorial(
  locale: Locale,
  limit = 12,
): Promise<EditorialPiece[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('editorial')
    .select(
      'id, slug, title, type, cover_image_url, author_name, topic_id, published_at',
    )
    .eq('status', 'published')
    .eq('language', locale)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('public: failed to load editorial', { message: error.message })
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    cover: row.cover_image_url,
    authorName: row.author_name,
    topicId: row.topic_id,
    publishedAt: row.published_at,
  }))
}
