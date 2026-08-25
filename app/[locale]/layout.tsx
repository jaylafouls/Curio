import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale, getMessages } from 'next-intl/server'
import { dmSerifDisplay, inter } from '../fonts'
import { routing, isSupportedLocale } from '@/lib/i18n/routing'
import { ConsentProvider } from '@/components/consent/consent-provider'

// Statically render the two known locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * Per-locale root layout — owns <html lang> so the document language always
 * matches the URL locale (SEO + a11y). Font CSS variables are attached to
 * <html> so Tailwind's font-serif/font-sans resolve everywhere. Messages are
 * provided to Client Components via NextIntlClientProvider.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) {
    notFound()
  }
  // Enable static rendering for this request's locale.
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${dmSerifDisplay.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          {/* CMP: strict opt-in consent gate, present on every page (chantier 7). */}
          <ConsentProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
