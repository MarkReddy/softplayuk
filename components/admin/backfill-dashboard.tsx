'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/components/admin-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

const PRESETS = [
  { value: 'west_midlands', label: 'West Midlands' },
  { value: 'birmingham_30mi', label: 'Birmingham (30 mi radius)' },
  { value: 'greater_london', label: 'Greater London' },
  { value: 'greater_manchester', label: 'Greater Manchester' },
  { value: 'uk_full', label: 'United Kingdom (Full)' },
]

function statusColor(status: string) {
  switch (status) {
    case 'running': return 'default'
    case 'completed': return 'secondary'
    case 'failed': return 'destructive'
    default: return 'outline'
  }
}

export function BackfillDashboard() {
  const { fetchWithAuth, logout } = useAdminAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [preset, setPreset] = useState('west_midlands')
  const [message, setMessage] = useState('')

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/backfill/runs')
      if (res.ok) {
        const data = await res.json()
        setRuns(data.runs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [fetchRuns])

  const startRun = async () => {
    setStarting(true)
    setMessage('')
    try {
      const res = await fetchWithAuth('/api/admin/backfill/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Run #${data.runId} started for ${data.region}`)
        fetchRuns()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backfill Tool</h1>
          <p className="text-sm text-muted-foreground">
            Ingest real venue data from Google Places API into your database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/api-test">
            <Button variant="outline" size="sm">API Tests</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Start New Run */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Start New Backfill Run</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Region Preset
              </label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startRun} disabled={starting}>
              {starting ? 'Starting...' : 'Start Backfill'}
            </Button>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${message.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Runs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading runs...</p>
          ) : runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No backfill runs yet. Start one above to begin populating your database.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Run</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Region</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Progress</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Discovered</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Inserted</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Updated</th>
                    <th className="pb-2 font-medium text-muted-foreground">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const pct = run.totalCells > 0
                      ? Math.round((run.completedCells / run.totalCells) * 100)
                      : 0
                    return (
                      <tr key={run.id} className="border-b border-border/50">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/admin/backfill/runs/${run.id}`}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            #{run.id}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-foreground">{run.regionLabel}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusColor(run.status)}>
                            {run.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {run.completedCells}/{run.totalCells}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-foreground">{run.venuesDiscovered}</td>
                        <td className="py-3 pr-4 text-foreground">{run.venuesInserted}</td>
                        <td className="py-3 pr-4 text-foreground">{run.venuesUpdated}</td>
                        <td className="py-3 whitespace-nowrap text-muted-foreground">
                          {run.startedAt
                            ? new Date(run.startedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
