import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { CookieBanner } from '@/components/cookie-banner'
import { AnalyticsLoader } from '@/components/analytics'
import { SITE_URL } from '@/lib/site-config'

import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UK's #1 Soft Play Finder",
    template: "%s | UK's #1 Soft Play Finder",
  },
  description:
    'Find the best soft play centres near you. Trusted parent reviews, postcode search, filters, and venue details across the UK.',
  keywords: [
    'soft play',
    'soft play near me',
    'children soft play',
    'kids play centre',
    'indoor play area',
    'UK soft play',
    'toddler soft play',
    'indoor play centre near me',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: 'Softplay UK',
    title: "UK's #1 Soft Play Finder",
    description:
      'Find the best soft play centres near you. Trusted parent reviews, postcode search, filters, and venue details across the UK.',
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Softplay UK - Find the Best Soft Play Near You',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "UK's #1 Soft Play Finder",
    description:
      'Find the best soft play centres near you. Trusted parent reviews, postcode search, filters, and venue details across the UK.',
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#5B53A5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-GB" className={nunito.variable}>
      <body className="font-sans antialiased">
        {children}
        <CookieBanner />
        <AnalyticsLoader />
      </body>
    </html>
  )
}
