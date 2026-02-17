'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { AdminLogin } from '@/components/admin/admin-login'

export default function GenerateContentPage() {
  return (
    <AdminAuthProvider>
      <GenerateContentGate />
    </AdminAuthProvider>
  )
}

interface Stats {
  total: number
  withDescription: number
  withFacilities: number
  withReviews: number
  missingDescription: number
  missingFacilities: number
}

function GenerateContentGate() {
  const { isAuthenticated, fetchWithAuth } = useAdminAuth()
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [progress, setProgress] = useState({ processed: 0, total: 0, succeeded: 0, failed: 0 })
  const [batchSize] = useState(5)
  const [type, setType] = useState<'all' | 'descriptions' | 'reviews' | 'facilities'>('all')

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/generate-content')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        setProgress((p) => ({ ...p, total: data.total }))
      }
    } catch {}
  }, [fetchWithAuth])

  useEffect(() => {
    if (isAuthenticated) fetchStats()
  }, [isAuthenticated, fetchStats])

  const runBatch = useCallback(async (offset: number): Promise<{ nextOffset: number; done: boolean; processed: number; errors: number; errorDetails: string[] }> => {
    const res = await fetchWithAuth('/api/admin/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, offset, type }),
    })
    const text = await res.text()
    if (!text) throw new Error(`Empty response (status ${res.status})`)
    let data
    try { data = JSON.parse(text) } catch { throw new Error(`Invalid JSON: ${text.substring(0, 200)}`) }
    if (!res.ok) throw new Error(data.error || 'API error')
    return data
  }, [fetchWithAuth, batchSize, type])

  if (!isAuthenticated) return <AdminLogin />

  const handleStart = async () => {
    setRunning(true)
    setLog([])
    setProgress({ processed: 0, total: stats?.total || 2000, succeeded: 0, failed: 0 })

    let offset = 0
    let batchNum = 0
    let totalSucceeded = 0
    let totalFailed = 0

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        batchNum++
        appendLog(`Batch ${batchNum}: processing venues ${offset + 1}-${offset + batchSize}...`)

        const result = await runBatch(offset)

        totalSucceeded += result.processed
        totalFailed += result.errors
        setProgress({
          processed: offset + batchSize,
          total: stats?.total || 2000,
          succeeded: totalSucceeded,
          failed: totalFailed,
        })

        if (result.errors > 0 && result.errorDetails?.length > 0) {
          result.errorDetails.forEach((e: string) => appendLog(`  ERROR: ${e}`))
        }

        appendLog(`Batch ${batchNum} complete: ${result.processed} succeeded, ${result.errors} failed`)

        if (result.done) {
          appendLog('All venues processed!')
          break
        }

        offset = result.nextOffset
        // Brief delay between batches for Groq rate limits
        await new Promise((r) => setTimeout(r, 1500))
      }
    } catch (err) {
      appendLog(`FATAL: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
      appendLog(`Generation complete. Total: ${totalSucceeded} succeeded, ${totalFailed} failed.`)
      // Refresh stats
      fetchStats()
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Generate Content</h1>
          <p className="text-sm text-muted-foreground">
            AI-generate descriptions, facilities, and reviews for all venues
          </p>
        </div>
        <Link href="/admin/backfill" className="text-sm text-primary underline">
          Back to Backfill
        </Link>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Venues</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-brand-green">{stats.withDescription}</p>
            <p className="text-xs text-muted-foreground">With Description</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-brand-green">{stats.withFacilities}</p>
            <p className="text-xs text-muted-foreground">With Facilities</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-brand-green">{stats.withReviews}</p>
            <p className="text-xs text-muted-foreground">With Reviews</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold">Settings</h2>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-foreground">Content type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground"
              disabled={running}
            >
              <option value="all">All (descriptions + facilities + reviews)</option>
              <option value="descriptions">Descriptions only</option>
              <option value="facilities">Facilities only</option>
              <option value="reviews">Reviews only</option>
            </select>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Processes {batchSize} venues per batch with parallel AI calls per venue (description + facilities + reviews run simultaneously).
            Each batch completes in ~30-45 seconds. For ~2,000 venues this will take approximately 3-4 hours total.
          </p>
          <Button onClick={handleStart} disabled={running} size="lg">
            {running ? `Running...` : 'Start Generation'}
          </Button>
        </div>

        {(running || progress.succeeded > 0 || progress.failed > 0) && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-2 font-serif text-lg font-bold">Progress</h3>
            <div className="mb-2 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min((progress.processed / Math.max(progress.total, 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex gap-6 text-sm">
              <p className="text-muted-foreground">
                {Math.min(progress.processed, progress.total)} / {progress.total} venues
              </p>
              <p className="font-medium text-brand-green">
                {progress.succeeded} succeeded
              </p>
              {progress.failed > 0 && (
                <p className="font-medium text-destructive">
                  {progress.failed} failed
                </p>
              )}
            </div>
          </div>
        )}

        {log.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-2 font-serif text-lg font-bold">Log</h3>
            <div className="max-h-80 overflow-y-auto rounded-xl bg-secondary/50 p-4 font-mono text-xs text-muted-foreground">
              {log.map((line, i) => (
                <div key={i} className={`py-0.5 ${line.includes('ERROR') ? 'text-destructive' : ''} ${line.includes('succeeded') ? 'text-brand-green' : ''}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
