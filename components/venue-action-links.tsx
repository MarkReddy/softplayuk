'use client'

import { Phone, Globe, MapPin, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackOutboundClick, trackDirectionsClick, trackCallClick } from '@/lib/analytics'

interface VenueActionLinksProps {
  venueId: number
  phone?: string | null
  website?: string | null
  lat: number
  lng: number
  name: string
  postcode: string
}

export function VenueActionLinks({ venueId, phone, website, lat, lng, name, postcode }: VenueActionLinksProps) {
  function handleCallClick() {
    trackCallClick(venueId)
  }

  function handleWebsiteClick() {
    if (!website) return
    try {
      const domain = new URL(website).hostname.replace('www.', '')
      trackOutboundClick(venueId, domain)
    } catch {
      trackOutboundClick(venueId, website)
    }
  }

  function handleDirectionsClick() {
    trackDirectionsClick(venueId)
  }

  function handleMapsClick() {
    trackDirectionsClick(venueId)
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="space-y-3">
      {phone && (
        <Button asChild className="w-full rounded-xl" size="lg">
          <a href={`tel:${phone}`} onClick={handleCallClick}>
            <Phone className="h-4 w-4" />
            Call {phone}
          </a>
        </Button>
      )}
      {website && (
        <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
          <a href={website} target="_blank" rel="noopener noreferrer" onClick={handleWebsiteClick}>
            <Globe className="h-4 w-4" />
            Visit website
          </a>
        </Button>
      )}
      <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDirectionsClick}
        >
          <MapPin className="h-4 w-4" />
          Get directions
        </a>
      </Button>
      <Button variant="ghost" className="w-full rounded-xl" size="lg" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        Share venue
      </Button>
    </div>
  )
}

/** Tracked "Open in Google Maps" button for the location section */
export function VenueMapLink({ venueId, name, postcode }: { venueId: number; name: string; postcode: string }) {
  return (
    <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + postcode)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackDirectionsClick(venueId)}
      >
        <MapPin className="h-4 w-4" />
        Open in Google Maps
      </a>
    </Button>
  )
}
