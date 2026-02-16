'use client'

import { useEffect, useState, useCallback } from 'react'
import useSWR from 'swr'
import { MapPin, Loader2 } from 'lucide-react'
import { VenueCard } from './venue-card'
import type { Venue } from '@/lib/types'

// Leamington Spa CV32 6EX
const DEFAULT_LAT = 52.2852
const DEFAULT_LNG = -1.5364

interface NearbyResponse {
  lat: number
  lng: number
  locationLabel: string
  isDefault: boolean
  count: number
  venues: (Venue & { distance: number })[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function VenuesNearYou() {
  const [coords, setCoords] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [locationResolved, setLocationResolved] = useState(false)

  const resolveLocation = useCallback(() => {
    // Try browser geolocation first
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: 'you',
          })
          setLocationResolved(true)
        },
        () => {
          // Geolocation denied or failed -- try IP-based via Vercel headers
          fetch('/api/geo')
            .then((r) => r.json())
            .then((data) => {
              if (data.lat && data.lng) {
                setCoords({ lat: data.lat, lng: data.lng, label: data.city || 'you' })
              } else {
                // Fall back to Leamington Spa
                setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, label: 'Leamington Spa' })
              }
              setLocationResolved(true)
            })
            .catch(() => {
              setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, label: 'Leamington Spa' })
              setLocationResolved(true)
            })
        },
        { timeout: 5000, maximumAge: 600000 },
      )
    } else {
      // No geolocation support -- use default
      setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, label: 'Leamington Spa' })
      setLocationResolved(true)
    }
  }, [])

  useEffect(() => {
    resolveLocation()
  }, [resolveLocation])

  const queryUrl = coords
    ? `/api/venues/nearby?lat=${coords.lat}&lng=${coords.lng}&label=${encodeURIComponent(coords.label)}&limit=6&radius=30`
    : null

  const { data, isLoading } = useSWR<NearbyResponse>(
    locationResolved ? queryUrl : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  // Still resolving location
  if (!locationResolved || isLoading) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Finding venues near you...</span>
          </div>
        </div>
      </section>
    )
  }

  // No data or no venues found
  if (!data || data.count === 0) {
    return null
  }

  const heading =
    data.locationLabel === 'you'
      ? 'Venues near you'
      : `Venues near ${data.locationLabel}`

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-2 flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-center font-serif text-3xl font-bold text-foreground">
            {heading}
          </h2>
        </div>
        <p className="mb-10 text-center text-muted-foreground">
          {data.isDefault
            ? 'Showing soft play centres near Leamington Spa. Allow location access for results near you.'
            : `Showing ${data.count} soft play centre${data.count !== 1 ? 's' : ''} within 30 miles`}
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </section>
  )
}
