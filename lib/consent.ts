'use client'

// ─── UK GDPR + PECR Cookie Consent Utility ────────────────
// Consent is stored in localStorage with a 6-month expiry.
// No non-essential cookies or scripts fire before explicit consent.

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

export interface ConsentPreferences {
  necessary: true // Always true -- cannot be toggled off
  analytics: boolean
  marketing: boolean
  timestamp: string // ISO date when consent was given
  expiresAt: string // ISO date -- 6 months from consent
}

const CONSENT_KEY = 'spf_cookie_consent'
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000

// ─── Read ──────────────────────────────────────────────────

export function getConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null

    const prefs: ConsentPreferences = JSON.parse(raw)

    // Check expiry
    if (new Date(prefs.expiresAt) < new Date()) {
      localStorage.removeItem(CONSENT_KEY)
      return null
    }

    return prefs
  } catch {
    return null
  }
}

// ─── Write ─────────────────────────────────────────────────

export function setConsent(prefs: Pick<ConsentPreferences, 'analytics' | 'marketing'>): void {
  if (typeof window === 'undefined') return

  const now = new Date()
  const consent: ConsentPreferences = {
    necessary: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    timestamp: now.toISOString(),
    expiresAt: new Date(now.getTime() + SIX_MONTHS_MS).toISOString(),
  }

  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))

  // Dispatch custom event so other parts of the app can react
  window.dispatchEvent(new CustomEvent('consent-updated', { detail: consent }))
}

// ─── Helpers ───────────────────────────────────────────────

export function hasAnalyticsConsent(): boolean {
  const prefs = getConsent()
  return prefs?.analytics === true
}

export function hasMarketingConsent(): boolean {
  const prefs = getConsent()
  return prefs?.marketing === true
}

export function hasRespondedToConsent(): boolean {
  return getConsent() !== null
}

export function resetConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_KEY)
  window.dispatchEvent(new CustomEvent('consent-updated', { detail: null }))
}

// ─── Accept / Reject Shortcuts ─────────────────────────────

export function acceptAll(): void {
  setConsent({ analytics: true, marketing: true })
}

export function rejectNonEssential(): void {
  setConsent({ analytics: false, marketing: false })
}
