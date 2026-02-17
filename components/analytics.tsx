'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { hasAnalyticsConsent } from '@/lib/consent'

/**
 * Google Analytics Loader
 *
 * The gtag script loads on EVERY page so Google can detect the tag.
 * Consent Mode v2 is used: analytics starts DENIED by default,
 * then is GRANTED once the user accepts cookies via the banner.
 * This is GDPR-compliant and allows Google to verify the tag.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function AnalyticsLoader() {
  useEffect(() => {
    if (!GA_ID) return

    // Grant consent if user already accepted
    if (hasAnalyticsConsent()) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      })
    }

    // Listen for future consent changes
    const handleConsentUpdate = () => {
      if (hasAnalyticsConsent()) {
        window.gtag?.('consent', 'update', {
          analytics_storage: 'granted',
        })
      }
    }

    window.addEventListener('consent-updated', handleConsentUpdate)
    return () =>
      window.removeEventListener('consent-updated', handleConsentUpdate)
  }, [])

  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });

          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  )
}
