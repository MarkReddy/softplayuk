'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useAdminAuth } from '@/components/admin-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AVAILABLE_REGIONS, AVAILABLE_CITIES, type BackfillMode, type BackfillProgress } from '@/lib/backfill/types'

function statusColor(s: string) {
  switch (s) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
    case 'running': return 'bg-amber-500/10 text-amber-700 border-amber-200'
    case 'failed': return 'bg-red-500/10 text-red-700 border-red-200'
    case 'paused': return 'bg-blue-500/10 text-blue-700 border-blue-200'
    default: return 'bg-muted text-muted-foreground'
  }
}

export function BackfillDashboard() {
  const { fetchWithAuth, logout } = useAdminAuth()

  const fetcher = useCallback(async (url: string) => {
    const res = await fetchWithAuth(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }, [fetchWithAuth])

  const { data: runsData, mutate: refreshRuns } = useSWR('/api/admin/backfill/runs', fetcher, {
    refreshInterval: 5000,
  })
  const runs: BackfillProgress[] = runsData?.runs || []

  const [mode, setMode] = useState<BackfillMode>('region')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [enrichDetails, setEnrichDetails] = useState(true)
  const [starting, setStarting] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<{ totalCells: number } | null>(null)
  const [error, setError] = useState('')
  const [lastStartedId, setLastStartedId] = useState<number | null>(null)

  const canStart = mode === 'full_uk' || (mode === 'region' && !!region) || (mode === 'city' && !!city)

  const handleDryRun = async () => {
    setError('')
    setDryRunResult(null)
    try {
      const res = await fetchWithAuth('/api/admin/backfill/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, region: region || undefined, city: city || undefined, enrichDetails, dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Dry run failed'); return }
      setDryRunResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const handleStart = async () => {
    setError('')
    setStarting(true)
    setDryRunResult(null)
    setLastStartedId(null)
    try {
      // The API creates the run and returns immediately.
      // Execution happens in the background via next/server after().
      // The dashboard polls /api/admin/backfill/runs every 5s for live progress.
      const res = await fetchWithAuth('/api/admin/backfill/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, region: region || undefined, city: city || undefined, enrichDetails, dryRun: false }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to start'); return }
      setLastStartedId(data.runId)
      refreshRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
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
          <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
        </div>
      </div>

      {/* ─── Start New Run ─── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Start New Backfill Run</CardTitle>
          <CardDescription>Choose a mode and target area to begin ingesting venues.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => { setMode(v as BackfillMode); setDryRunResult(null); setError('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">By Region</SelectItem>
                  <SelectItem value="city">By City</SelectItem>
                  <SelectItem value="full_uk">Full UK (large -- many API calls)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'region' && (
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_REGIONS.map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === 'city' && (
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue placeholder="Select city..." /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CITIES.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch id="enrich" checked={enrichDetails} onCheckedChange={setEnrichDetails} />
            <Label htmlFor="enrich">
              Enrich with Place Details (phone, hours, postcode -- uses more API quota)
            </Label>
          </div>

          {dryRunResult && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Dry Run Preview</p>
              <p className="mt-1 text-muted-foreground">
                This run will search <strong>{dryRunResult.totalCells} grid cells</strong>.
                {enrichDetails && ' Each discovered venue will also use a Details API call.'}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          {lastStartedId && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              Run #{lastStartedId} started! It is now running in the background.{' '}
              <Link href={`/admin/backfill/runs/${lastStartedId}`} className="font-medium underline">
                View live progress
              </Link>
              {' '}or check the Run History below (auto-refreshes every 5s).
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDryRun} disabled={!canStart || starting}>
              Dry Run (preview cells)
            </Button>
            <Button onClick={handleStart} disabled={starting || !canStart}>
              {starting ? 'Starting...' : 'Start Backfill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Run History ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run History</CardTitle>
          <CardDescription>
            {runs.length} run{runs.length !== 1 ? 's' : ''} recorded. Auto-refreshes every 5s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No runs yet. Start your first backfill above.
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const pct = run.totalCells > 0 ? Math.round((run.processedCells / run.totalCells) * 100) : 0
                return (
                  <Link
                    key={run.runId}
                    href={`/admin/backfill/runs/${run.runId}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium">#{run.runId}</span>
                          <Badge variant="outline" className={statusColor(run.status)}>{run.status}</Badge>
                          <Badge variant="secondary" className="text-xs">{run.mode}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{run.region || 'Unknown region'}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{run.inserted} inserted, {run.updated} updated</p>
                        <p>{run.discovered} discovered, {run.skipped} skipped</p>
                        {run.enriched > 0 && <p>{run.enriched} enriched</p>}
                      </div>
                    </div>
                    {run.status === 'running' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cells: {run.processedCells}/{run.totalCells}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    {run.error && (
                      <p className="mt-2 truncate text-xs text-red-600">{run.error}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
