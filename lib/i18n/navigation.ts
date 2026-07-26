import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware navigation primitives. Use these `Link`, `redirect`, `router`,
 * and `pathname` instead of next/navigation so locale prefixes stay correct
 * and URLs remain stable across EN/FR.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
