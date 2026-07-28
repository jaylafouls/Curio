import type { BadgeTopic } from '@/components/ui'

/**
 * Onboarding shared types (chantier Onboarding, screens 03-08).
 *
 * A `Topic` row as the onboarding funnel needs it: the DB `topics` table
 * (Data Model §3) trimmed to what screens 03/05 render — id (slug), the
 * locale-resolved label, and the lucide icon name stored in `topics.icon`.
 */
export type Topic = {
  /** Slug PK, e.g. "travel" — also the union member for the Badge palette. */
  id: BadgeTopic
  /** Already resolved to the active locale (label_en / label_fr). */
  label: string
  /** lucide-react icon name in kebab-case, from topics.icon. */
  icon: string
}

/**
 * A curator suggestion for screen 04. Empty in production today (no Founding
 * Curators recruited yet) — the query is built and simply returns [] until
 * curators exist, at which point the screen lights up with no code change.
 */
export type CuratorSuggestion = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  /** Primary topic used for the role badge, when derivable. */
  topic: BadgeTopic
  role: string
  bio: string
  followers: number
}

/** The 5 fixed universe colours (users.universe_color enum, Data Model §2). */
export const UNIVERSE_COLORS = [
  'violet',
  'beige',
  'vert',
  'bleu',
  'rose',
] as const

export type UniverseColor = (typeof UNIVERSE_COLORS)[number]
