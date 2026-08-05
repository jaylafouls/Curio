import {
  Home,
  Search,
  Users,
  Bookmark,
  Sparkles,
  FolderOpen,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

/**
 * Connected navigation model (spec §7.2 sidebar / §7.3 bottom nav), shared by
 * the desktop sidebar and the mobile bottom nav so the two never drift.
 *
 * Only routes that actually render are listed — same "no dead links" discipline
 * as the public footer. Settings (§7.2) landed in chantier 13 and lives in the
 * sidebar account footer (next to Log out), not in these groups, so it is not in
 * this list. Remaining deferred items from §7.2 (Likes, History, standalone
 * Collections index) stay absent until their routes exist; adding them here as
 * 404-links would be worse than omitting them.
 *
 * `key` is the i18n key under the `AppNav` namespace. `href` is locale-agnostic
 * (the i18n <Link> adds the prefix). `bottomNav` marks the ≤5 items surfaced in
 * the mobile bottom bar (§7.3: Home · Explore · [FAB] · Collections · My Space).
 */
export type AppNavItem = {
  key: string
  href: string
  icon: LucideIcon
  /** Surface this item in the mobile bottom nav (limited real estate). */
  bottomNav?: boolean
}

/** Primary group — discovery + the user's saved content. */
export const PRIMARY_NAV: readonly AppNavItem[] = [
  { key: 'home', href: '/home', icon: Home, bottomNav: true },
  { key: 'explore', href: '/explore', icon: Search, bottomNav: true },
  { key: 'curators', href: '/curators', icon: Users },
  { key: 'saved', href: '/saved', icon: Bookmark, bottomNav: true },
] as const

/** "My Space" group — the user's own organisational space. */
export const MY_SPACE_NAV: readonly AppNavItem[] = [
  { key: 'myUniverse', href: '/my-space', icon: Sparkles, bottomNav: true },
  { key: 'projects', href: '/projects', icon: FolderOpen },
  { key: 'analytics', href: '/analytics', icon: BarChart3 },
] as const

/** Flattened list for the mobile bottom bar, in display order. */
export const BOTTOM_NAV: readonly AppNavItem[] = [
  ...PRIMARY_NAV,
  ...MY_SPACE_NAV,
].filter((item) => item.bottomNav)
