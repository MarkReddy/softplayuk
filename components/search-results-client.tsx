'use client'

import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { VenueCard } from '@/components/venue-card'
import { SearchFilters } from '@/components/search-filters'
import { PostcodeSearch } from '@/components/postcode-search'
import { Loader2, SearchX } from 'lucide-react'
import { useState } from 'react'
import type { SearchResult } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SearchResultsClient() {
  const searchParams = useSearchParams()
  const lat = searchParams.get('lat') || ''
  const lng = searchParams.get('lng') || ''
  const postcode = searchParams.get('postcode') || ''

  const [sortBy, setSortBy] = useState('rating')
  const [ageGroup, setAgeGroup] = useState('all')
  const [priceBand, setPriceBand] = useState('all')
  const [radius, setRadius] = useState('50')
  const [senOnly, setSenOnly] = useState(false)

  const params = new URLSearchParams()
  if (lat) params.set('lat', lat)
  if (lng) params.set('lng', lng)
  params.set('radius', radius)
  params.set('sortBy', sortBy)
  if (ageGroup !== 'all') params.set('ageGroup', ageGroup)
  if (priceBand !== 'all') params.set('priceBand', priceBand)
  if (senOnly) params.set('senFriendly', 'true')

  const { data: results, isLoading } = useSWR<SearchResult[]>(
    `/api/search?${params.toString()}`,
    fetcher,
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">
          {postcode
            ? `Soft play near ${postcode.toUpperCase()}`
            : 'Search for soft play centres'}
        </h1>
        <p className="text-muted-foreground">
          {postcode
            ? 'Sorted by what matters most to parents. Ratings blend Google reviews with first-hand parent reports.'
            : 'Enter your postcode to find venues near you'}
        </p>
      </div>

      {!postcode && (
        <div className="mb-8 flex justify-center">
          <PostcodeSearch size="sm" />
        </div>
      )}

      {postcode && (
        <div className="mb-6">
          <SearchFilters
            sortBy={sortBy}
            ageGroup={ageGroup}
            priceBand={priceBand}
            radius={radius}
            senOnly={senOnly}
            onSortChange={setSortBy}
            onAgeChange={setAgeGroup}
            onPriceChange={setPriceBand}
            onRadiusChange={setRadius}
            onSenToggle={() => setSenOnly((prev) => !prev)}
            onClearFilters={() => {
              setAgeGroup('all')
              setPriceBand('all')
              setSenOnly(false)
            }}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Finding great venues...</p>
        </div>
      )}

      {!isLoading && results && results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {results.length} venue{results.length !== 1 ? 's' : ''} found
            {postcode ? ` near ${postcode.toUpperCase()}` : ''}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        </>
      )}

      {!isLoading && results && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <SearchX className="mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-2 font-serif text-xl font-bold text-foreground">
            No venues found
          </h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            {postcode
              ? `We could not find any soft play centres within ${radius} miles of ${postcode.toUpperCase()}. Try expanding your search radius.`
              : 'Try searching with your postcode to find venues near you.'}
          </p>
          <PostcodeSearch size="sm" />
        </div>
      )}
    </div>
  )
}
