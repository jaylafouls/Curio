# Curio

Curation social network — *the internet worth keeping.*

Phase 1 · Fondations — chantier 1/7 (Setup projet & infra). This repo currently
contains the project scaffold: Next.js App Router, the full design-token system,
i18n (EN/FR), Supabase clients (EU Frankfurt), and the SEO / analytics / consent
architecture. No product features yet — those land in later chantiers.

## Stack

- **Next.js 15** (App Router, React 19), **TypeScript** (strict)
- **Tailwind CSS** — all design tokens in `tailwind.config.ts`
- **Supabase** (Postgres + Auth + Storage + Edge Functions) — **EU Frankfurt
  region only** (`eu-central-1`), non-negotiable for RGPD
- **next-intl** — EN (default) + FR, always-prefixed URLs (`/en`, `/fr`)
- **PostHog Cloud EU** — analytics, **opt-in strict** (no event before consent)
- **Axeptio** — cookie CMP (wired in chantier 7)
- **Vercel** — hosting

## Cross-cutting rules (non-negotiable, applied from day one)

1. **SEO native** — every public page ships `generateMetadata()` (via
   `lib/seo/`), uses `next/image` + `next/font`, and has a stable URL. Canonical
   + hreflang + OG are generated for free by `buildMetadata()`. `robots.ts` and
   `sitemap.ts` are in place.
2. **Opt-in strict analytics** — the `lib/analytics` wrapper gates every event
   on `analytics` consent; until granted, no PostHog SDK loads and nothing is
   sent.
3. **No non-essential cookie by default** — consent defaults to `necessary`
   only (`lib/consent`). Supabase auth cookies are strictly necessary and only
   appear once a user authenticates.

## Project structure

```
app/
  layout.tsx              # passthrough root (imports global CSS)
  fonts.ts                # next/font: Instrument Serif (400) + Inter
  globals.css             # base layer + Cosmic/Archive CSS variables
  robots.ts, sitemap.ts   # SEO infrastructure
  [locale]/
    layout.tsx            # <html lang>, next-intl provider, font vars
    page.tsx              # token-showcase placeholder + Supabase ping
    curators/[username]/  # stable public URL (scaffold)
    collections/[id]/     # stable public URL (scaffold)
components/ui/            # empty — prepared for the Design system chantier
lib/
  i18n/                   # routing, navigation, request config
  supabase/               # browser + server clients, env guard, ping
  analytics/              # PostHog wrapper (no-op until consent)
  consent/                # consent types + store + React hook (Axeptio-ready)
  seo/                    # buildMetadata helper + placeholder shell
messages/                # en.json, fr.json
tailwind.config.ts       # ALL design tokens (colors, fonts, spacing, …)
```

## Design tokens

Source of truth: `docs/CURIO_DESIGN_TOKENS_v1_3.md`, translated into
`tailwind.config.ts`. No default Tailwind palette and no system fonts are used
on Curio surfaces. Archive (`#FAFBF2`) is the default light surface; Cosmic
(`#0D0E15`) dark mode is toggled via a `dark` class. Screens are validated
against the mockups by screenshot comparison.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000  →  redirects to /en
```

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Required environment variables

See `.env.example` for the full list and inline notes. Summary:

| Variable | Purpose | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Project **must** be in EU Frankfurt (`eu-central-1`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Public key |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for SEO | Set to prod domain on Vercel |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | EU cloud; inert until consent |
| `NEXT_PUBLIC_AXEPTIO_CLIENT_ID` | Axeptio CMP client id | Wired in chantier 7 |

The app runs without Supabase/PostHog set: the home page reports Supabase as
"not configured" and analytics stays inert. Nothing crashes.
