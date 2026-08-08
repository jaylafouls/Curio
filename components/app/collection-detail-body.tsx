/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui'
import { EmptyState } from '@/components/public/empty-state'
import type {
  CollectionDetail,
  CollectionLink,
} from '@/lib/collections/data'

/**
 * CollectionDetailBody — the PUBLIC, crawler-visible render of a collection
 * (spec §8.7 / §10): cover, topic badge, title, description, owner, link count,
 * then links grouped under their Sections with an "Unsectioned" bucket last.
 *
 * Presentational and server-rendered so it lands in the ISR HTML for SEO. The
 * owner's private note and edit controls are NOT here — they mount client-side
 * via the owner overlay so the cached public HTML never leaks them.
 */
function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function LinkRow({ link }: { link: CollectionLink }) {
  return (
    <a
      href={link.urlOrigin}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className="group flex items-center gap-md rounded-md px-sm py-md transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
    >
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-foreground/[0.03]">
        {link.image ? (
          <img src={link.image} alt="" className="size-full object-cover" />
        ) : (
          <ExternalLink
            className="size-5 text-foreground/30"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2xs">
        <span className="truncate font-sans text-body text-foreground">
          {link.title}
        </span>
        {link.description ? (
          <span className="line-clamp-1 font-sans text-body-small text-foreground/60">
            {link.description}
          </span>
        ) : null}
        <span className="truncate font-sans text-meta text-foreground/50">
          {sourceDomain(link.urlOrigin)}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-foreground/30 transition-colors group-hover:text-foreground/60"
        strokeWidth={2}
        aria-hidden
      />
    </a>
  )
}

export function CollectionDetailBody({
  collection,
  labels,
}: {
  collection: CollectionDetail
  labels: {
    by: string
    linksCount: string
    unsectioned: string
    emptyTitle: string
    emptyBody: string
  }
}) {
  const { sections, links } = collection

  // Group links by section id; anything with no (or an unknown) section falls
  // into the "Unsectioned" bucket, rendered last.
  const sectionIds = new Set(sections.map((s) => s.id))
  const bySection = new Map<string, CollectionLink[]>()
  const unsectioned: CollectionLink[] = []
  for (const link of links) {
    if (link.sectionId && sectionIds.has(link.sectionId)) {
      const arr = bySection.get(link.sectionId) ?? []
      arr.push(link)
      bySection.set(link.sectionId, arr)
    } else {
      unsectioned.push(link)
    }
  }

  return (
    <article className="mx-auto w-full max-w-4xl px-lg py-2xl lg:px-2xl">
      {collection.cover ? (
        <div className="relative mb-xl aspect-[3/1] w-full overflow-hidden rounded-lg border border-border bg-foreground/[0.03]">
          <Image
            src={collection.cover}
            alt=""
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      ) : null}

      <header className="mb-2xl flex flex-col gap-md">
        <Badge topic={collection.topic} />
        <h1 className="font-serif text-h1 text-foreground">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="max-w-2xl font-sans text-body text-foreground/70">
            {collection.description}
          </p>
        ) : null}
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm">
            <Avatar
              src={collection.owner.avatar ?? undefined}
              name={collection.owner.name}
              size="sm"
            />
            <span className="font-sans text-body-small text-foreground/70">
              {labels.by}
            </span>
          </div>
          <span className="font-sans text-meta text-foreground/50">
            {labels.linksCount}
          </span>
        </div>
      </header>

      {links.length === 0 ? (
        <EmptyState
          tag={labels.emptyTitle}
          tagTopic={collection.topic}
          title={labels.emptyTitle}
          body={labels.emptyBody}
        />
      ) : (
        <div className="flex flex-col gap-2xl">
          {sections.map((section) => {
            const secLinks = bySection.get(section.id) ?? []
            if (secLinks.length === 0) return null
            return (
              <section key={section.id} className="flex flex-col gap-sm">
                <h2 className="font-serif text-h3 text-foreground">
                  {section.name}
                </h2>
                <div className="flex flex-col">
                  {secLinks.map((link) => (
                    <LinkRow key={link.id} link={link} />
                  ))}
                </div>
              </section>
            )
          })}

          {unsectioned.length > 0 ? (
            <section className="flex flex-col gap-sm">
              {sections.length > 0 ? (
                <h2 className="font-serif text-h3 text-foreground/70">
                  {labels.unsectioned}
                </h2>
              ) : null}
              <div className="flex flex-col">
                {unsectioned.map((link) => (
                  <LinkRow key={link.id} link={link} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </article>
  )
}
