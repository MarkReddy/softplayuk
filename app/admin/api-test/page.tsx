'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ApiResult {
  endpoint: string
  status: number | null
  duration: number
  data: unknown
  error: string | null
}

interface CityRow {
  city: string
  region?: string | null
  country?: string | null
  slug?: string
  venueCount?: number
}

const ENDPOINTS = [
  { label: 'Health Check', path: '/api/health', method: 'GET' },
  { label: 'Google Places Test', path: '/api/admin/backfill/test-google', method: 'GET' },
  { label: 'Venue Count', path: '/api/venues/count', method: 'GET' },
  { label: 'Venues (page 1)', path: '/api/venues?limit=5&offset=0', method: 'GET' },
  { label: 'Venues (page 2)', path: '/api/venues?limit=5&offset=5', method: 'GET' },
  { label: 'All Cities', path: '/api/cities', method: 'GET' },
] as const

export default function AdminApiTestPage() {
  const [results, setResults] = useState<ApiResult[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Cities test state
  const [cityLimit, setCityLimit] = useState('50')
  const [cityOffset, setCityOffset] = useState('0')
  const [cityResult, setCityResult] = useState<{
    total: number
    returned: number
    duration: number
    cities: CityRow[]
  } | null>(null)

  const callEndpoint = useCallback(async (path: string, label: string) => {
    setLoading(label)
    const start = performance.now()

    try {
      const res = await fetch(path)
      const duration = Math.round(performance.now() - start)
      const data = await res.json()

      setResults((prev) => [
        { endpoint: `${label} (${path})`, status: res.status, duration, data, error: null },
        ...prev,
      ])
    } catch (err) {
      const duration = Math.round(performance.now() - start)
      setResults((prev) => [
        {
          endpoint: `${label} (${path})`,
          status: null,
          duration,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
        ...prev,
      ])
    } finally {
      setLoading(null)
    }
  }, [])

  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length < 2) return
    callEndpoint(`/api/venues/search?q=${encodeURIComponent(searchQuery.trim())}`, 'Venue Search')
  }, [searchQuery, callEndpoint])

  const handleCityTest = useCallback(async () => {
    setLoading('Cities Test')
    const start = performance.now()
    const params = new URLSearchParams()
    if (cityLimit) params.set('limit', cityLimit)
    if (cityOffset && cityOffset !== '0') params.set('offset', cityOffset)

    try {
      const res = await fetch(`/api/cities?${params.toString()}`)
      const duration = Math.round(performance.now() - start)
      const data = await res.json()
      setCityResult({
        total: data.total ?? 0,
        returned: data.returned ?? 0,
        duration,
        cities: (data.cities ?? []).slice(0, 50),
      })
    } catch {
      setCityResult({ total: 0, returned: 0, duration: 0, cities: [] })
    } finally {
      setLoading(null)
    }
  }, [cityLimit, cityOffset])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">API Test Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal tool. Click buttons to test each endpoint and inspect the JSON response.
        </p>
      </div>

      {/* Preset Endpoints */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Tests</h2>
        <div className="flex flex-wrap gap-3">
          {ENDPOINTS.map((ep) => (
            <Button
              key={ep.path}
              variant="outline"
              size="sm"
              disabled={loading === ep.label}
              onClick={() => callEndpoint(ep.path, ep.label)}
            >
              {loading === ep.label ? 'Loading...' : ep.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text Search */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Venue Search</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Search by name, city, postcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={loading === 'Venue Search' || searchQuery.trim().length < 2}
            onClick={handleSearch}
          >
            {loading === 'Venue Search' ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Cities Test */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Cities API Test</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Test GET /api/cities with custom limit/offset. Omit limit to return all cities (capped at 20,000).
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="city-limit" className="mb-1 block text-xs font-medium text-muted-foreground">
              Limit
            </label>
            <Input
              id="city-limit"
              type="number"
              placeholder="(all)"
              value={cityLimit}
              onChange={(e) => setCityLimit(e.target.value)}
              className="w-28"
            />
          </div>
          <div>
            <label htmlFor="city-offset" className="mb-1 block text-xs font-medium text-muted-foreground">
              Offset
            </label>
            <Input
              id="city-offset"
              type="number"
              placeholder="0"
              value={cityOffset}
              onChange={(e) => setCityOffset(e.target.value)}
              className="w-28"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loading === 'Cities Test'}
            onClick={handleCityTest}
          >
            {loading === 'Cities Test' ? 'Loading...' : 'Run Test'}
          </Button>
        </div>

        {cityResult && (
          <div>
            <div className="mb-3 flex flex-wrap gap-4 text-sm">
              <span className="text-foreground">
                Total: <strong>{cityResult.total}</strong>
              </span>
              <span className="text-foreground">
                Returned: <strong>{cityResult.returned}</strong>
              </span>
              <span className="text-muted-foreground">
                {cityResult.duration}ms
              </span>
            </div>

            {cityResult.cities.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-foreground">#</th>
                      <th className="px-3 py-2 font-medium text-foreground">City</th>
                      <th className="px-3 py-2 font-medium text-foreground">Region</th>
                      <th className="px-3 py-2 font-medium text-foreground">Slug</th>
                      <th className="px-3 py-2 font-medium text-foreground">Venues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityResult.cities.map((city, i) => (
                      <tr key={city.slug ?? i} className="border-t border-border/50">
                        <td className="px-3 py-2 text-muted-foreground">{(Number(cityOffset) || 0) + i + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{city.city}</td>
                        <td className="px-3 py-2 text-muted-foreground">{city.region ?? '-'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{city.slug}</td>
                        <td className="px-3 py-2 text-muted-foreground">{city.venueCount ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {cityResult.cities.length < cityResult.returned && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing first 50 of {cityResult.returned} returned rows
              </p>
            )}
          </div>
        )}
      </div>

      {/* General Results */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Response Log</h2>
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No results yet. Click a button above to call an endpoint.
          </p>
        )}
        {results.map((result, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">{result.endpoint}</span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  result.status && result.status >= 200 && result.status < 300
                    ? 'bg-primary/10 text-primary'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {result.status ?? 'ERR'}
              </span>
              <span className="text-xs text-muted-foreground">{result.duration}ms</span>
            </div>
            {result.error && (
              <p className="mb-2 text-sm text-destructive">{result.error}</p>
            )}
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
