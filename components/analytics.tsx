'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { hasAnalyticsConsent } from '@/lib/consent'

/**
 * Conditional Analytics Loader
 *
 * This component ONLY loads Google Analytics (or any future analytics tool)
 * AFTER the user has given explicit consent via the cookie banner.
 *
 * If consent is not given or is revoked, no analytics scripts are loaded.
 *
 * Usage: Add <AnalyticsLoader /> to the root layout.
 * Set NEXT_PUBLIC_GA_ID env var to enable Google Analytics.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function AnalyticsLoader() {
  const [consentGiven, setConsentGiven] = useState(false)

  useEffect(() => {
    // Check on mount
    setConsentGiven(hasAnalyticsConsent())

    // Re-check when consent changes
    const handleConsentUpdate = () => {
      setConsentGiven(hasAnalyticsConsent())
    }

    window.addEventListener('consent-updated', handleConsentUpdate)
    return () =>
      window.removeEventListener('consent-updated', handleConsentUpdate)
  }, [])

  // No GA ID configured -- render nothing
  if (!GA_ID) return null

  // Consent not given -- render nothing (no scripts fire)
  if (!consentGiven) return null

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
