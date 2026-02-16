'use client'

import { useState, useCallback } from 'react'
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

function GenerateContentGate() {
  const { isAuthenticated, fetchWithAuth } = useAdminAuth()
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [batchSize] = useState(20)
  const [type, setType] = useState<'all' | 'descriptions' | 'reviews' | 'facilities'>('all')

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const runBatch = useCallback(async (offset: number): Promise<number> => {
    const res = await fetchWithAuth('/api/admin/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, offset, type }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    return data.done ? -1 : data.nextOffset
  }, [fetchWithAuth, batchSize, type])

  if (!isAuthenticated) return <AdminLogin />

  const handleStart = async () => {
    setRunning(true)
    setLog([])
    let offset = 0
    let batchNum = 0

    // First get total count
    try {
      const countRes = await fetch('/api/venues/count')
      const countData = await countRes.json()
      setProgress({ processed: 0, total: countData.count || 2000 })
    } catch {
      setProgress({ processed: 0, total: 2000 })
    }

    try {
      while (offset >= 0) {
        batchNum++
        appendLog(`Starting batch ${batchNum} (offset ${offset}, batch size ${batchSize})...`)
        const nextOffset = await runBatch(offset)
        if (nextOffset === -1) {
          appendLog('All venues processed!')
          break
        }
        setProgress((prev) => ({ ...prev, processed: nextOffset }))
        appendLog(`Batch ${batchNum} dispatched. Moving to offset ${nextOffset}...`)
        // Small delay between batches to avoid rate limits
        await new Promise((r) => setTimeout(r, 2000))
        offset = nextOffset
      }
    } catch (err) {
      appendLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
      appendLog('Generation run complete.')
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
            Processes {batchSize} venues at a time with AI. Each batch takes ~30-60 seconds.
            For ~2,000 venues this will take approximately 30-60 minutes total.
          </p>
          <Button onClick={handleStart} disabled={running} size="lg">
            {running ? `Running... (${progress.processed}/${progress.total})` : 'Start Generation'}
          </Button>
        </div>

        {progress.total > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-2 font-serif text-lg font-bold">Progress</h3>
            <div className="mb-2 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min((progress.processed / progress.total) * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {progress.processed} / {progress.total} venues dispatched
            </p>
          </div>
        )}

        {log.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-2 font-serif text-lg font-bold">Log</h3>
            <div className="max-h-80 overflow-y-auto rounded-xl bg-secondary/50 p-4 font-mono text-xs text-muted-foreground">
              {log.map((line, i) => (
                <div key={i} className="py-0.5">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
