'use client'

import Link from 'next/link'
import { MapPin, Loader2 } from 'lucide-react'
import useSWR from 'swr'

interface CityResult {
  city: string
  slug: string
  region: string | null
  venueCount?: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function PopularSearches() {
  const { data, isLoading } = useSWR<{ total: number; returned: number; cities: CityResult[] }>(
    '/api/cities',
    fetcher,
    { revalidateOnFocus: false },
  )

  const cities = data?.cities ?? []

  return (
    <section className="py-14">
      <div className="mx-auto max-w-4xl px-5">
        <h2 className="mb-2 text-center text-xl font-bold text-foreground">
          Browse by city
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {data ? `${data.total} cities with soft play centres` : 'Explore soft play centres across the UK'}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : cities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No cities found</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/soft-play/${city.slug}`}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                {city.city}
                {city.venueCount ? (
                  <span className="text-xs text-muted-foreground">({city.venueCount})</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
