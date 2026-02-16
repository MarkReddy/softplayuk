'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import useSWR from 'swr'

interface RegionResult {
  region: string
  slug: string
  venueCount: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface SearchFiltersProps {
  sortBy: string
  ageGroup: string
  priceBand: string
  radius: string
  senOnly: boolean
  region: string
  onSortChange: (val: string) => void
  onAgeChange: (val: string) => void
  onPriceChange: (val: string) => void
  onRadiusChange: (val: string) => void
  onSenToggle: () => void
  onRegionChange: (val: string) => void
  onClearFilters: () => void
}

export function SearchFilters({
  sortBy,
  ageGroup,
  priceBand,
  radius,
  senOnly,
  region,
  onSortChange,
  onAgeChange,
  onPriceChange,
  onRadiusChange,
  onSenToggle,
  onRegionChange,
  onClearFilters,
}: SearchFiltersProps) {
  const { data: regionsData } = useSWR<{ regions: RegionResult[] }>(
    '/api/regions',
    fetcher,
    { revalidateOnFocus: false },
  )

  const regions = regionsData?.regions ?? []
  const hasFilters = ageGroup !== 'all' || priceBand !== 'all' || senOnly || region !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[170px] rounded-xl bg-card">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="distance">Nearest first</SelectItem>
            <SelectItem value="price">Price: low to high</SelectItem>
            <SelectItem value="cleanliness">Cleanest first</SelectItem>
          </SelectContent>
        </Select>

        <Select value={radius} onValueChange={onRadiusChange}>
          <SelectTrigger className="w-[150px] rounded-xl bg-card">
            <SelectValue placeholder="Radius" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Within 5 miles</SelectItem>
            <SelectItem value="10">Within 10 miles</SelectItem>
            <SelectItem value="25">Within 25 miles</SelectItem>
            <SelectItem value="50">Within 50 miles</SelectItem>
            <SelectItem value="100">Within 100 miles</SelectItem>
          </SelectContent>
        </Select>

        <Select value={region} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[180px] rounded-xl bg-card">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.slug} value={r.slug}>
                {r.region} ({r.venueCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageGroup} onValueChange={onAgeChange}>
          <SelectTrigger className="w-[140px] rounded-xl bg-card">
            <SelectValue placeholder="Age group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ages</SelectItem>
            <SelectItem value="0-2">0&#8211;2 years</SelectItem>
            <SelectItem value="2-4">2&#8211;4 years</SelectItem>
            <SelectItem value="4-6">4&#8211;6 years</SelectItem>
            <SelectItem value="6-8">6&#8211;8 years</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priceBand} onValueChange={onPriceChange}>
          <SelectTrigger className="w-[130px] rounded-xl bg-card">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any price</SelectItem>
            <SelectItem value="1">{'\u00a3 Budget'}</SelectItem>
            <SelectItem value="2">{'\u00a3\u00a3 Mid-range'}</SelectItem>
            <SelectItem value="3">{'\u00a3\u00a3\u00a3 Premium'}</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={onSenToggle}
          className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
            senOnly
              ? 'border-primary bg-primary/10 font-medium text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/50'
          }`}
        >
          SEN friendly
        </button>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {region !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 rounded-full"
              onClick={() => onRegionChange('all')}
            >
              Region: {regions.find((r) => r.slug === region)?.region ?? region} <X className="h-3 w-3" />
            </Badge>
          )}
          {ageGroup !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 rounded-full"
              onClick={() => onAgeChange('all')}
            >
              Age: {ageGroup} yrs <X className="h-3 w-3" />
            </Badge>
          )}
          {priceBand !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 rounded-full"
              onClick={() => onPriceChange('all')}
            >
              Price:{' '}
              {priceBand === '1'
                ? '\u00a3'
                : priceBand === '2'
                  ? '\u00a3\u00a3'
                  : '\u00a3\u00a3\u00a3'}{' '}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {senOnly && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 rounded-full"
              onClick={onSenToggle}
            >
              SEN friendly <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
