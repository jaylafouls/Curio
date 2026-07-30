import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// next-intl reads the request config from lib/i18n/request.ts
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next/image is used everywhere for SEO/perf. Remote patterns will grow as
  // Supabase Storage and OG-image hosts are wired in later chantiers.
  images: {
    remotePatterns: [
      // Supabase Storage (EU Frankfurt project). Scoped to the storage object
      // path so nothing loads from an unexpected origin. The host is the project
      // ref (derived from the anon JWT — KNOWLEDGE rule #1), stable per project.
      {
        protocol: 'https',
        hostname: 'leijjsyimganjpfhctbw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
