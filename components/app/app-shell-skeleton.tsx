import type { ReactNode } from 'react'

/**
 * AppShellSkeleton — a data-free silhouette of the connected frame
 * (AppShellFrame): the desktop sidebar rail and the sticky top bar, rendered as
 * inert shimmer blocks, with the real page content in the main column.
 *
 * The session-gated shells (CollectionConnectedShell) paint this the instant
 * they mount FOR A LIKELY-SIGNED-IN visitor (see lib/auth/session-hint), while
 * the actual connected data (saveTargets, unread count, avatar…) is still being
 * fetched by the Server Action. It removes the chrome-less blank flash a
 * client-side navigation into a cookie-free ISR page would otherwise show, then
 * is swapped for the real AppShellFrame the moment the fetch resolves.
 *
 * It carries NO user data and NO interactivity — matching the frame's layout
 * (fixed sidebar width, sticky top bar height) is enough to hold the shape so the
 * content does not jump when the real frame takes over. Anonymous visitors and
 * crawlers never see it: the shells only mount it behind the client session hint,
 * and it is never part of the server render.
 */
export function AppShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground" aria-hidden={false}>
      {/* Sidebar rail silhouette — desktop only, matching AppSidebar's lg width. */}
      <div className="hidden w-64 shrink-0 flex-col gap-lg border-r border-border p-lg lg:flex">
        <div className="h-7 w-28 animate-pulse rounded-md bg-foreground/[0.06]" />
        <div className="mt-lg flex flex-col gap-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-full animate-pulse rounded-md bg-foreground/[0.04]"
            />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-sm">
          <div className="size-8 animate-pulse rounded-full bg-foreground/[0.06]" />
          <div className="h-4 w-24 animate-pulse rounded bg-foreground/[0.04]" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar silhouette — same height/border/sticky as AppShellFrame's. */}
        <div className="sticky top-0 z-30 flex items-center gap-md border-b border-border bg-background/90 px-lg py-sm backdrop-blur-md lg:px-2xl">
          <div className="h-6 w-24 animate-pulse rounded bg-foreground/[0.05] lg:hidden" />
          <div className="flex-1" />
          <div className="size-8 animate-pulse rounded-full bg-foreground/[0.05]" />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
