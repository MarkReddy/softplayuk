'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Run {
  id: number
  provider: string
  regionLabel: string
  status: string
  totalCells: number
  completedCells: number
  venuesDiscovered: number
  venuesInserted: number
  venuesUpdated: number
  venuesSkipped: number
  errors: string[]
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface RunVenue {
  venueId: number
  googlePlaceId: string
  action: string
  name?: string
  city?: string
}

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

function RunDetailContent() {
  const params = useParams()
  const runId = params.id as string
  const { fetchWithAuth } = useAdminAuth()
  const [run, setRun] = useState<Run | null>(null)
  const [venues, setVenues] = useState<RunVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/backfill/runs/${runId}`)
      if (res.ok) {
        const data = await res.json()
        setRun(data.run)
        setVenues(data.venues || [])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to load run')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth, runId])

  useEffect(() => {
    fetchData()
    // Poll while running
    const interval = setInterval(() => {
      fetchData()
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading run #{runId}...</p>
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Run not found'}</p>
        <Link href="/admin/backfill">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const pct = run.totalCells > 0
    ? Math.round((run.completedCells / run.totalCells) * 100)
    : 0

  const isRunning = run.status === 'running'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/backfill">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Run #{run.id}
        </h1>
        <Badge variant={
          run.status === 'running' ? 'default' :
          run.status === 'completed' ? 'secondary' :
          run.status === 'failed' ? 'destructive' : 'outline'
        }>
          {run.status}
        </Badge>
        {isRunning && (
          <span className="text-sm text-muted-foreground">
            (auto-refreshing)
          </span>
        )}
      </div>

      {/* Progress bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Grid progress: {run.completedCells} / {run.totalCells} cells
            </span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${isRunning ? 'animate-pulse bg-primary' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{run.venuesDiscovered}</p>
            <p className="text-xs text-muted-foreground">Discovered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{run.venuesInserted}</p>
            <p className="text-xs text-muted-foreground">Inserted (new)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{run.venuesUpdated}</p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{run.venuesSkipped}</p>
            <p className="text-xs text-muted-foreground">Skipped/Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Run details */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provider</dt>
                <dd className="text-foreground">{run.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Region</dt>
                <dd className="text-foreground">{run.regionLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">
                  {new Date(run.createdAt).toLocaleString('en-GB')}
                </dd>
              </div>
              {run.startedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Started</dt>
                  <dd className="text-foreground">
                    {new Date(run.startedAt).toLocaleString('en-GB')}
                  </dd>
                </div>
              )}
              {run.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd className="text-foreground">
                    {new Date(run.completedAt).toLocaleString('en-GB')}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Errors */}
        {run.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Errors ({run.errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto">
                <ul className="flex flex-col gap-1.5">
                  {run.errors.map((err, i) => (
                    <li key={i} className="text-xs text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Venues affected */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Venues Affected ({venues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {venues.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {isRunning ? 'Venues will appear here as they are processed...' : 'No venues recorded for this run.'}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">City</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Action</th>
                    <th className="pb-2 font-medium text-muted-foreground">Place ID</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-foreground">
                        {v.name || 'Unknown'}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {v.city || '-'}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={v.action === 'inserted' ? 'default' : 'secondary'}>
                          {v.action}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {v.googlePlaceId.substring(0, 20)}...
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
