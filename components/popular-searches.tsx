'use client'

import Link from 'next/link'
import { MapPin, Loader2 } from 'lucide-react'
import useSWR from 'swr'
import { useState } from 'react'

interface CityResult {
  city: string
  slug: string
  region: string | null
  venueCount?: number
}

interface RegionResult {
  region: string
  slug: string
  venueCount: number
  cityCount: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function PopularSearches() {
  const [tab, setTab] = useState<'region' | 'city'>('region')

  const { data: regionsData, isLoading: regionsLoading } = useSWR<{ total: number; regions: RegionResult[] }>(
    '/api/regions',
    fetcher,
    { revalidateOnFocus: false },
  )

  const { data: citiesData, isLoading: citiesLoading } = useSWR<{ total: number; returned: number; cities: CityResult[] }>(
    '/api/cities?limit=30',
    fetcher,
    { revalidateOnFocus: false },
  )

  const regions = regionsData?.regions ?? []
  const cities = citiesData?.cities ?? []
  const isLoading = tab === 'region' ? regionsLoading : citiesLoading

  // Don't render the section if both are empty and loaded
  if (!regionsLoading && !citiesLoading && regions.length === 0 && cities.length === 0) {
    return null
  }

  return (
    <section className="py-14">
      <div className="mx-auto max-w-4xl px-5">
        <h2 className="mb-2 text-center text-xl font-bold text-foreground">
          Browse soft play across the UK
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {regionsData
            ? `${regionsData.total} regions and ${citiesData?.total ?? 0} cities with soft play centres`
            : 'Explore soft play centres across the United Kingdom'}
        </p>

        {/* Tab switcher */}
        <div className="mb-6 flex justify-center gap-2">
          <button
            onClick={() => setTab('region')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'region'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/30'
            }`}
          >
            By region
          </button>
          <button
            onClick={() => setTab('city')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'city'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/30'
            }`}
          >
            By city
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tab === 'region' ? (
          regions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No regions found yet</p>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-3">
                {regions.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/regions/${r.slug}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    {r.region}
                    <span className="text-xs text-muted-foreground">({r.venueCount})</span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link href="/regions" className="text-sm font-medium text-primary hover:underline">
                  View all regions
                </Link>
              </div>
            </>
          )
        ) : (
          cities.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No cities found yet</p>
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
          )
        )}
      </div>
    </section>
  )
}
