import { icons, type LucideProps } from 'lucide-react'

/**
 * TopicIcon — renders a lucide icon from the kebab-case name stored in
 * `topics.icon` (e.g. "heart-pulse", "book-open"). The DB seed (0003) is the
 * single source for which icon each Topic uses; this resolves that string to
 * the matching lucide component so screen 03/05 need no local icon map.
 *
 * lucide-react's `icons` export is keyed by PascalCase, so we convert
 * kebab → Pascal. Unknown/missing names fall back to a neutral dot so a bad
 * seed value degrades gracefully instead of crashing the funnel.
 */
function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export interface TopicIconProps extends LucideProps {
  /** kebab-case lucide name from topics.icon. */
  name: string
}

export function TopicIcon({ name, ...props }: TopicIconProps) {
  const Icon = icons[toPascalCase(name) as keyof typeof icons] ?? icons.Circle
  return <Icon aria-hidden {...props} />
}
