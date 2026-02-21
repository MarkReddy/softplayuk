'use client'

import { useEffect } from 'react'
import { trackVenueView } from '@/lib/analytics'

/** Fires a venue_view GA4 event on mount. Renders nothing. */
export function VenueViewTracker({ venueId, slug }: { venueId: number; slug: string }) {
  useEffect(() => {
    trackVenueView(venueId, slug)
  }, [venueId, slug])

  return null
}
