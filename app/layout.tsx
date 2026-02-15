import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { CookieBanner } from '@/components/cookie-banner'
import { AnalyticsLoader } from '@/components/analytics'

import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: {
    default: 'Softplay UK - Find the Best Soft Play Centres Near You',
    template: '%s | Softplay UK',
  },
  description:
    'Discover the best soft play centres for kids across the UK. Trusted reviews, real parent insights, postcode search. Find safe, clean, fun play centres near you.',
  keywords: [
    'soft play',
    'soft play near me',
    'children soft play',
    'kids play centre',
    'indoor play area',
    'UK soft play',
    'toddler soft play',
  ],
  openGraph: {
    title: 'Softplay UK - Find the Best Soft Play Centres Near You',
    description:
      'Discover the best soft play centres for kids across the UK. Trusted reviews, real parent insights.',
    type: 'website',
    locale: 'en_GB',
  },
}

export const viewport: Viewport = {
  themeColor: '#c4705a',
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
