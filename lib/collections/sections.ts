import type { BadgeTopic } from '@/components/ui'
import type { Locale } from '@/lib/i18n/routing'

/**
 * Suggested Section names per Topic, offered at Collection creation.
 *
 * Source: docs/CURIO_ADD_ITEM_FLOW_v3_1.md §4.6 — the 10 Core Topics each have a
 * suggested set. These are a *static application config*, not DB rows (data model
 * §7: "pas de table pour les templates de sections suggérées — config
 * applicative statique"). They are suggestions only: the user freely edits,
 * removes, or ignores them, and can name Sections by hand.
 *
 * FR labels are transcribed verbatim from the spec table; EN is the natural
 * translation. Keyed by the 10 Core topic ids (BadgeTopic union).
 */
type BilingualList = { en: string[]; fr: string[] }

const SUGGESTIONS: Record<BadgeTopic, BilingualList> = {
  travel: {
    en: ['Hotels', 'Restaurants', 'Places to see', 'Itinerary'],
    fr: ['Hôtels', 'Restaurants', 'Lieux à voir', 'Itinéraire'],
  },
  food: {
    en: ['To try', 'Recipes', 'Places', 'Ingredients'],
    fr: ['À tester', 'Recettes', 'Adresses', 'Ingrédients'],
  },
  style: {
    en: ['To shop', 'Inspirations', 'Favorite brands'],
    fr: ['À shopper', 'Inspirations', 'Marques favorites'],
  },
  beauty: {
    en: ['Routine', 'Tried products', 'Favorite brands', 'Salons'],
    fr: ['Routine', 'Produits testés', 'Marques favorites', 'Coiffeurs/instituts'],
  },
  wellness: {
    en: ['Routine', 'Exercises', 'Healthy recipes', 'Places'],
    fr: ['Routine', 'Exercices', 'Recettes santé', 'Adresses'],
  },
  design: {
    en: ['Places', 'Objects', 'References'],
    fr: ['Lieux', 'Objets', 'Références'],
  },
  books: {
    en: ['To read', 'In progress', 'Read', 'Quotes'],
    fr: ['À lire', 'En cours', 'Lus', 'Citations'],
  },
  photography: {
    en: ['Photographers', 'Places', 'Equipment'],
    fr: ['Photographes', 'Lieux', 'Équipement'],
  },
  ideas: {
    en: ['Articles', 'Tools', 'Resources'],
    fr: ['Articles', 'Outils', 'Ressources'],
  },
  culture: {
    en: ['Films', 'Series', 'Music', 'Exhibitions'],
    fr: ['Films', 'Séries', 'Musique', 'Expositions'],
  },
}

/** Suggested section names for a topic in the given locale ([] if none/unknown). */
export function suggestedSections(
  topic: BadgeTopic,
  locale: Locale,
): string[] {
  const set = SUGGESTIONS[topic]
  if (!set) return []
  return locale === 'fr' ? set.fr : set.en
}
