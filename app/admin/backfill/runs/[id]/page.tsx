'use client'

import { useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BackfillProgress } from '@/lib/backfill/types'

export default function RunDetailPage() {
  return (
    <AdminAuthProvider>
      <RunDetailGate />
    </AdminAuthProvider>
  )
}

function RunDetailGate() {
  const { isAuthenticated } = useAdminAuth()
  if (!isAuthenticated) return <AdminLogin />
  return <RunDetailContent />
}

interface VenueLog {
  googlePlaceId: string
  venueId: number | null
  venueName: string | null
  venueCity: string | null
  status: string
  confidence: number
  enrichment: string
  error: string | null
  createdAt: string
}

function statusBadgeClass(s: string) {
  switch (s) {
    case 'inserted': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
    case 'updated': return 'bg-blue-500/10 text-blue-700 border-blue-200'
    case 'failed': return 'bg-red-500/10 text-red-700 border-red-200'
    default: return 'bg-muted text-muted-foreground'
  }
}

function runStatusClass(s: string) {
  switch (s) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
    case 'running': return 'bg-amber-500/10 text-amber-700 border-amber-200'
    case 'failed': return 'bg-red-500/10 text-red-700 border-red-200'
    default: return 'bg-muted text-muted-foreground'
  }
}

function RunDetailContent() {
  const params = useParams()
  const runId = params.id as string
  const { fetchWithAuth } = useAdminAuth()

  const fetcher = useCallback(async (url: string) => {
    const res = await fetchWithAuth(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }, [fetchWithAuth])

  const { data, error: fetchError } = useSWR(
    `/api/admin/backfill/runs/${runId}`,
    fetcher,
    { refreshInterval: 3000 },
  )

  const progress: BackfillProgress | null = data?.progress || null
  const venueLog: { total: number; venues: VenueLog[] } = data?.venueLog || { total: 0, venues: [] }

  if (fetchError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">Failed to load run #{runId}</p>
        <Link href="/admin/backfill"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading run #{runId}...</p>
      </div>
    )
  }

  const pct = progress.totalCells > 0
    ? Math.round((progress.processedCells / progress.totalCells) * 100)
    : 0
  const isRunning = progress.status === 'running'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/backfill">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Run #{progress.runId}</h1>
        <Badge variant="outline" className={runStatusClass(progress.status)}>{progress.status}</Badge>
        <Badge variant="secondary" className="text-xs">{progress.mode}</Badge>
        {isRunning && <span className="text-xs text-muted-foreground">(auto-refreshing)</span>}
      </div>

      {/* Progress bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Grid: {progress.processedCells} / {progress.totalCells} cells
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${isRunning ? 'animate-pulse bg-primary' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress.durationMs && (
            <p className="mt-2 text-xs text-muted-foreground">
              Duration: {Math.round(progress.durationMs / 1000)}s
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Discovered', value: progress.discovered },
          { label: 'Inserted', value: progress.inserted },
          { label: 'Updated', value: progress.updated },
          { label: 'Skipped', value: progress.skipped },
          { label: 'Failed', value: progress.failed },
          { label: 'Enriched', value: progress.enriched },
          { label: 'Total cells', value: progress.totalCells },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="px-4 pt-4 pb-3">
              <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Run info */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Region</dt>
                <dd className="text-foreground">{progress.region || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="text-foreground">{progress.mode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Started</dt>
                <dd className="text-foreground">
                  {progress.startedAt ? new Date(progress.startedAt).toLocaleString('en-GB') : '-'}
                </dd>
              </div>
              {progress.durationMs && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-foreground">{Math.round(progress.durationMs / 1000)}s</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {progress.error && (
          <Card>
            <CardHeader><CardTitle className="text-base text-destructive">Error Log</CardTitle></CardHeader>
            <CardContent>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-destructive">
                {progress.error}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-venue log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Venue Log ({venueLog.total} total, showing {venueLog.venues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {venueLog.venues.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isRunning ? 'Venues will appear here as they are processed...' : 'No venues recorded for this run.'}
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">City</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Confidence</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Enrichment</th>
                    <th className="pb-2 font-medium text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {venueLog.venues.map((v, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-3 text-foreground">
                        {v.venueId ? (
                          <Link href={`/venue/${v.venueId}`} className="font-medium hover:underline">
                            {v.venueName || 'Unknown'}
                          </Link>
                        ) : (
                          v.venueName || 'Unknown'
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{v.venueCity || '-'}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={statusBadgeClass(v.status)}>{v.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                        {(v.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className="text-xs">{v.enrichment}</Badge>
                      </td>
                      <td className="max-w-[200px] truncate py-2 text-xs text-red-600">
                        {v.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
