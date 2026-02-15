'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getConsent,
  acceptAll,
  rejectNonEssential,
  setConsent,
  hasRespondedToConsent,
} from '@/lib/consent'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [marketingEnabled, setMarketingEnabled] = useState(false)

  useEffect(() => {
    // Show the banner if user has not yet responded
    if (!hasRespondedToConsent()) {
      setVisible(true)
    }

    // Listen for external "open cookie settings" events (from footer link)
    const handleOpen = () => {
      const prefs = getConsent()
      setAnalyticsEnabled(prefs?.analytics ?? false)
      setMarketingEnabled(prefs?.marketing ?? false)
      setShowPreferences(true)
      setVisible(true)
    }

    window.addEventListener('open-cookie-settings', handleOpen)
    return () => window.removeEventListener('open-cookie-settings', handleOpen)
  }, [])

  const handleAcceptAll = useCallback(() => {
    acceptAll()
    setVisible(false)
    setShowPreferences(false)
  }, [])

  const handleRejectNonEssential = useCallback(() => {
    rejectNonEssential()
    setVisible(false)
    setShowPreferences(false)
  }, [])

  const handleSavePreferences = useCallback(() => {
    setConsent({ analytics: analyticsEnabled, marketing: marketingEnabled })
    setVisible(false)
    setShowPreferences(false)
  }, [analyticsEnabled, marketingEnabled])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-lg md:p-6">
        {!showPreferences ? (
          <>
            <h2 className="mb-2 text-base font-bold text-foreground">
              We value your privacy
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              We use cookies to improve your experience. Necessary cookies keep
              the site working. Analytics cookies help us understand how you use
              the site.{' '}
              <Link
                href="/privacy-policy"
                className="underline transition-colors hover:text-foreground"
              >
                Read our Privacy Policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleAcceptAll}>
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectNonEssential}
              >
                Reject Non-Essential
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const prefs = getConsent()
                  setAnalyticsEnabled(prefs?.analytics ?? false)
                  setMarketingEnabled(prefs?.marketing ?? false)
                  setShowPreferences(true)
                }}
              >
                Manage Preferences
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-3 text-base font-bold text-foreground">
              Cookie Preferences
            </h2>

            {/* Necessary -- always on */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Necessary
                </p>
                <p className="text-xs text-muted-foreground">
                  Required for the site to function. Always enabled.
                </p>
              </div>
              <span className="text-xs font-medium text-accent">
                Always on
              </span>
            </div>

            {/* Analytics */}
            <label className="mb-3 flex cursor-pointer items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Analytics
                </p>
                <p className="text-xs text-muted-foreground">
                  Help us understand how visitors use the site.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled}
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
                  analyticsEnabled ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span className="sr-only">Toggle analytics cookies</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${
                    analyticsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {/* Marketing */}
            <label className="mb-4 flex cursor-pointer items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Marketing
                </p>
                <p className="text-xs text-muted-foreground">
                  Used for targeted advertising. Not currently active.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketingEnabled}
                onClick={() => setMarketingEnabled(!marketingEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
                  marketingEnabled ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span className="sr-only">Toggle marketing cookies</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${
                    marketingEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreferences(false)}
              >
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
