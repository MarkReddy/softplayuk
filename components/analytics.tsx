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

/** Push a gtag command via dataLayer (works even before gtag.js loads) */
function gtagPush(...args: unknown[]) {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).dataLayer = (window as any).dataLayer || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).dataLayer.push(arguments)
}

function grantAnalyticsConsent() {
  gtagPush('consent', 'update', {
    analytics_storage: 'granted',
  })
}

export function AnalyticsLoader() {
  useEffect(() => {
    if (!GA_ID) return

    // Grant consent if user already accepted
    if (hasAnalyticsConsent()) {
      grantAnalyticsConsent()
    }

    // Listen for future consent changes (e.g. user clicks "Accept All")
    const handleConsentUpdate = () => {
      if (hasAnalyticsConsent()) {
        grantAnalyticsConsent()
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

          // Check if user already consented (from localStorage)
          var hasConsent = false;
          try {
            var raw = localStorage.getItem('spf_cookie_consent');
            if (raw) {
              var prefs = JSON.parse(raw);
              if (prefs.analytics === true && new Date(prefs.expiresAt) > new Date()) {
                hasConsent = true;
              }
            }
          } catch(e) {}

          gtag('consent', 'default', {
            analytics_storage: hasConsent ? 'granted' : 'denied',
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
