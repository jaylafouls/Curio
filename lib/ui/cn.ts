import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * twMerge only knows Tailwind's stock font-size scale (text-xs/sm/base/…). Our
 * design system replaces it with named tokens (text-display/h1/h2/h3/body/
 * body-small/meta/eyebrow, tailwind.config.ts fontSize). Stock twMerge treats
 * those unknown `text-*` classes as *colors*, so combining a size token with a
 * real color token (e.g. `text-meta` + `text-[var(--button-text)]`) makes it
 * drop one as a false conflict — silently blanking the text color.
 *
 * Registering the custom font-sizes in the `font-size` group teaches twMerge to
 * separate size from colour, so both survive. This is why a `primary`+`small`
 * Button was rendering its label invisible.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'h1',
            'h2',
            'h3',
            'body',
            'body-small',
            'meta',
            'eyebrow',
          ],
        },
      ],
    },
  },
})

/**
 * Compose Tailwind class strings: clsx handles conditionals/arrays, twMerge
 * resolves conflicts so a caller's override (e.g. a custom `className` prop)
 * wins over a component's default (last-write-wins per utility group).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
