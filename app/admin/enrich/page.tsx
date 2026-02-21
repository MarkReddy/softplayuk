'use client'

import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Stats {
  total: number
  enriched: number
  withDescription: number
  withFacilities: number
  withReviews: number
  withHours: number
  remaining: number
}

interface BatchResult {
  id: number
  name: string
  ok: boolean
  error?: string
}

interface LogEntry {
  timestamp: string
  batch: number
  results: BatchResult[]
  message: string
}

export default function EnrichPage() {
  return (
    <AdminAuthProvider>
      <EnrichGate />
    </AdminAuthProvider>
  )
}

function EnrichGate() {
  const { isAuthenticated } = useAdminAuth()
  if (!isAuthenticated) return <AdminLogin />
  return <EnrichDashboard />
}

function EnrichDashboard() {
  const { fetchWithAuth } = useAdminAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [batchCount, setBatchCount] = useState(0)
  const [totalProcessed, setTotalProcessed] = useState(0)
  const [totalErrors, setTotalErrors] = useState(0)
  const [log, setLog] = useState<LogEntry[]>([])
  const [currentStatus, setCurrentStatus] = useState('')
  const [done, setDone] = useState(false)
  const pausedRef = useRef(false)
  const runningRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Fetch stats on mount
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/enrich-venues')
      if (res.ok) setStats(await res.json())
    } catch { /* ignore */ }
  }, [fetchWithAuth])

  useEffect(() => { refreshStats() }, [refreshStats])

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const processBatch = useCallback(async (): Promise<boolean> => {
    setCurrentStatus('Processing batch...')
    const res = await fetchWithAuth('/api/admin/enrich-venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 5 }),
    })

    if (!res.ok) {
      const err = await res.text()
      setCurrentStatus(`API error: ${err}`)
      return true // stop
    }

    const data = await res.json()
    const batchNum = batchCount + 1
    setBatchCount(prev => prev + 1)
    setTotalProcessed(prev => prev + (data.processed || 0))
    setTotalErrors(prev => prev + (data.errors || 0))

    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      batch: batchNum,
      results: data.results || [],
      message: data.message,
    }
    setLog(prev => [...prev, entry])
    await refreshStats()

    return data.done
  }, [fetchWithAuth, batchCount, refreshStats])

  const startEnrichment = useCallback(async () => {
    setRunning(true)
    setPaused(false)
    setDone(false)
    runningRef.current = true
    pausedRef.current = false

    while (runningRef.current && !pausedRef.current) {
      try {
        const isDone = await processBatch()
        if (isDone) {
          setDone(true)
          setCurrentStatus('All venues enriched.')
          break
        }
        // 2s delay between batches
        setCurrentStatus('Waiting 2s before next batch...')
        await new Promise(r => setTimeout(r, 2000))
      } catch (e) {
        setCurrentStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }

    setRunning(false)
    runningRef.current = false
    if (pausedRef.current) setCurrentStatus('Paused.')
  }, [processBatch])

  const pause = () => {
    pausedRef.current = true
    setPaused(true)
  }

  const resume = () => {
    if (!running) startEnrichment()
  }

  const reset = async () => {
    runningRef.current = false
    pausedRef.current = false
    setRunning(false)
    setPaused(false)
    setBatchCount(0)
    setTotalProcessed(0)
    setTotalErrors(0)
    setLog([])
    setCurrentStatus('')
    setDone(false)
    await refreshStats()
  }

  const pct = stats ? Math.round((stats.enriched / stats.total) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="font-serif text-3xl font-bold text-foreground">Venue Enrichment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Groq AI to generate descriptions, facilities, opening hours, and parent reviews for all thin venues.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Venues" value={stats.total} />
          <StatCard label="Enriched" value={stats.enriched} highlight />
          <StatCard label="Remaining" value={stats.remaining} />
          <StatCard label="With Reviews" value={stats.withReviews} />
          <StatCard label="With Description" value={stats.withDescription} />
          <StatCard label="With Facilities" value={stats.withFacilities} />
          <StatCard label="With Hours" value={stats.withHours} />
          <StatCard label="Errors This Run" value={totalErrors} error={totalErrors > 0} />
        </div>
      )}

      {/* Progress Bar */}
      {stats && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Overall Progress</span>
            <span className="text-muted-foreground">{pct}% ({stats.enriched}/{stats.total})</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!running && !done && (
          <button
            onClick={startEnrichment}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            {batchCount > 0 ? 'Resume' : 'Start Enrichment'}
          </button>
        )}
        {running && !paused && (
          <button
            onClick={pause}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
        )}
        {(batchCount > 0 || done) && !running && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
        {running && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentStatus}
          </span>
        )}
        {done && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </span>
        )}
      </div>

      {/* Session Stats */}
      {batchCount > 0 && (
        <div className="mb-6 flex gap-6 text-sm text-muted-foreground">
          <span>Batches: <strong className="text-foreground">{batchCount}</strong></span>
          <span>Processed: <strong className="text-foreground">{totalProcessed}</strong></span>
          <span>Errors: <strong className={totalErrors > 0 ? 'text-destructive' : 'text-foreground'}>{totalErrors}</strong></span>
        </div>
      )}

      {/* Event Log */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Enrichment Log</h2>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-4">
          {log.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No batches processed yet. Click &quot;Start Enrichment&quot; to begin.
            </p>
          ) : (
            <div className="space-y-3">
              {log.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Batch {entry.batch} -- {entry.timestamp}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.message}</span>
                  </div>
                  <div className="space-y-1">
                    {entry.results.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        {r.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className={r.ok ? 'text-foreground' : 'text-destructive'}>
                          {r.name}
                        </span>
                        {r.error && (
                          <span className="truncate text-xs text-muted-foreground">-- {r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  error,
}: {
  label: string
  value: number
  highlight?: boolean
  error?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`text-2xl font-bold ${
          error ? 'text-destructive' : highlight ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}
