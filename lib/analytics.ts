/**
 * GA4 event tracking utility.
 *
 * Safely calls window.gtag when available.
 * When NEXT_PUBLIC_GA_DEBUG=true, events are also logged to the console.
 * Never throws -- silently no-ops if GA is not loaded.
 */

const IS_DEBUG = process.env.NEXT_PUBLIC_GA_DEBUG === 'true'

type GtagParams = Record<string, string | number | boolean | undefined>

function gtag(command: string, ...args: unknown[]) {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (typeof w.gtag === 'function') {
    w.gtag(command, ...args)
  }
}

function track(eventName: string, params: GtagParams = {}) {
  // Strip undefined values
  const clean: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v
  }

  if (IS_DEBUG) {
    console.log(`[GA4 Debug] ${eventName}`, clean)
  }

  gtag('event', eventName, clean)
}

// ── Specific event helpers ──────────────────────────────────

/** User submits a postcode search */
export function trackPostcodeSearch(postcode: string, lat?: number, lng?: number) {
  track('postcode_search', { postcode, lat, lng })
}

/** User changes a search filter */
export function trackFilterChange(filterName: string, filterValue: string) {
  track('filter_change', { filter_name: filterName, filter_value: filterValue })
}

/** Venue detail page loaded */
export function trackVenueView(venueId: number, slug: string) {
  track('venue_view', { venue_id: venueId, venue_slug: slug })
}

/** User clicks outbound venue website link */
export function trackOutboundClick(venueId: number, domain: string) {
  track('outbound_click', { venue_id: venueId, domain })
}

/** User clicks get directions / open in maps */
export function trackDirectionsClick(venueId: number) {
  track('directions_click', { venue_id: venueId })
}

/** User clicks a phone number */
export function trackCallClick(venueId: number) {
  track('call_click', { venue_id: venueId })
}
