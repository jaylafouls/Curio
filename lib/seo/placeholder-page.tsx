import type { ReactNode } from 'react'

/**
 * Shared shell for the scaffolded public routes created this chantier. These
 * routes exist to make the stable-URL architecture visible (brief rule 1) —
 * the real pages are built in later chantiers. Each still ships valid,
 * indexable metadata via its own generateMetadata; this only renders a
 * minimal, on-token "coming soon" body so the route resolves.
 */
export function PlaceholderPage({
  label,
  children,
}: {
  label: string
  children?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-md px-lg py-4xl">
      <p className="font-sans text-eyebrow uppercase text-olive">{label}</p>
      <h1 className="font-serif text-h1 text-text-dark">Coming soon</h1>
      {children}
    </main>
  )
}
