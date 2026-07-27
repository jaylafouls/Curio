import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose Tailwind class strings: clsx handles conditionals/arrays, twMerge
 * resolves conflicts so a caller's override (e.g. a custom `className` prop)
 * wins over a component's default (last-write-wins per utility group).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
