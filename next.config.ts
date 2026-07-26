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
      // Supabase Storage (EU Frankfurt project). Host filled once the project
      // ref is known; kept explicit so nothing loads from an unexpected origin.
      // { protocol: 'https', hostname: '<project-ref>.supabase.co' },
    ],
  },
}

export default withNextIntl(nextConfig)
