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

const ENDPOINTS = [
  { label: 'Health Check', path: '/api/health', method: 'GET' },
  { label: 'Venue Count', path: '/api/venues/count', method: 'GET' },
  { label: 'Venues (page 1)', path: '/api/venues?limit=5&offset=0', method: 'GET' },
  { label: 'Venues (page 2)', path: '/api/venues?limit=5&offset=5', method: 'GET' },
] as const

export default function AdminApiTestPage() {
  const [results, setResults] = useState<ApiResult[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

      {/* Results */}
      <div className="flex flex-col gap-4">
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
