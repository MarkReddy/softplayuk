'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity, CheckCircle2, XCircle, Send, Trash2 } from 'lucide-react'
import {
  trackPostcodeSearch,
  trackFilterChange,
  trackVenueView,
  trackOutboundClick,
  trackDirectionsClick,
  trackCallClick,
} from '@/lib/analytics'

interface EventLog {
  id: number
  timestamp: string
  event: string
  params: Record<string, unknown>
}

const EVENT_DEFINITIONS = [
  {
    name: 'postcode_search',
    description: 'Fired when a user submits a postcode search',
    fire: () => trackPostcodeSearch('SW1A 1AA', 51.5014, -0.1419),
    params: { postcode: 'SW1A 1AA', lat: 51.5014, lng: -0.1419 },
  },
  {
    name: 'filter_change',
    description: 'Fired when a search filter is changed',
    fire: () => trackFilterChange('radius', '10'),
    params: { filter_name: 'radius', filter_value: '10' },
  },
  {
    name: 'venue_view',
    description: 'Fired when a venue detail page loads',
    fire: () => trackVenueView(42, 'fun-factory-london-abc1'),
    params: { venue_id: 42, venue_slug: 'fun-factory-london-abc1' },
  },
  {
    name: 'outbound_click',
    description: 'Fired when clicking a venue website link',
    fire: () => trackOutboundClick(42, 'funfactory.co.uk'),
    params: { venue_id: 42, domain: 'funfactory.co.uk' },
  },
  {
    name: 'directions_click',
    description: 'Fired when clicking get directions / Google Maps',
    fire: () => trackDirectionsClick(42),
    params: { venue_id: 42 },
  },
  {
    name: 'call_click',
    description: 'Fired when clicking a phone number',
    fire: () => trackCallClick(42),
    params: { venue_id: 42 },
  },
] as const

export default function TrackingTestPage() {
  const [gaDetected, setGaDetected] = useState<boolean | null>(null)
  const [gaId, setGaId] = useState<string>('')
  const [debugMode, setDebugMode] = useState(false)
  const [logs, setLogs] = useState<EventLog[]>([])
  const [nextId, setNextId] = useState(1)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const detected = typeof w.gtag === 'function'
    setGaDetected(detected)
    setGaId(process.env.NEXT_PUBLIC_GA_ID || 'not set')
    setDebugMode(process.env.NEXT_PUBLIC_GA_DEBUG === 'true')
  }, [])

  const fireEvent = useCallback(
    (def: (typeof EVENT_DEFINITIONS)[number]) => {
      def.fire()
      const entry: EventLog = {
        id: nextId,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        event: def.name,
        params: { ...def.params },
      }
      setLogs((prev) => [entry, ...prev])
      setNextId((n) => n + 1)
    },
    [nextId],
  )

  const clearLogs = () => setLogs([])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="font-serif text-3xl font-bold text-foreground">GA4 Tracking Test</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Manually fire each tracked event and validate in GA4 DebugView.
        </p>
      </div>

      {/* Status panel */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-foreground">
          <Activity className="h-5 w-5" />
          Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusRow
            label="window.gtag detected"
            value={gaDetected === null ? 'Checking...' : gaDetected ? 'Yes' : 'No'}
            ok={gaDetected ?? false}
          />
          <StatusRow label="NEXT_PUBLIC_GA_ID" value={gaId || 'not set'} ok={!!gaId && gaId !== 'not set'} />
          <StatusRow label="NEXT_PUBLIC_GA_DEBUG" value={debugMode ? 'true' : 'false'} ok={debugMode} />
        </div>
        {!gaDetected && gaDetected !== null && (
          <p className="mt-3 text-sm text-destructive">
            GA is not loaded. Events will still be logged here but will not reach Google Analytics.
            Have you accepted cookies? Is the GA_ID env var set?
          </p>
        )}
      </div>

      {/* Event buttons */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-foreground">Fire Events</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EVENT_DEFINITIONS.map((def) => (
            <button
              key={def.name}
              onClick={() => fireEvent(def)}
              className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Send className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              <div>
                <span className="block font-mono text-sm font-semibold text-foreground">{def.name}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">{def.description}</span>
                <span className="mt-1 block font-mono text-[11px] text-muted-foreground/70">
                  {JSON.stringify(def.params)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Event log */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-foreground">
            Event Log{' '}
            <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">({logs.length})</span>
          </h2>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No events fired yet. Click a button above to test.
          </p>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg bg-secondary/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {log.event}
                  </span>
                  {gaDetected ? (
                    <span className="text-xs text-emerald-600">Sent to GA</span>
                  ) : (
                    <span className="text-xs text-amber-600">GA not loaded</span>
                  )}
                </div>
                <pre className="font-mono text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(log.params, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation instructions */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-serif text-lg font-bold text-foreground">How to Validate</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Accept cookies</strong> on the site first (or the gtag script
            will be in consent-denied mode and won{"'"}t forward events to GA).
          </li>
          <li>
            <strong className="text-foreground">Enable GA4 DebugView:</strong> Go to{' '}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Analytics
            </a>{' '}
            {'>'} Admin {'>'} DebugView. Events from debug mode appear here in real time.
          </li>
          <li>
            <strong className="text-foreground">Enable debug mode in the browser:</strong> Install the{' '}
            <a
              href="https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Analytics Debugger
            </a>{' '}
            Chrome extension, or set{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_GA_DEBUG=true
            </code>{' '}
            in your environment variables to log events to the browser console.
          </li>
          <li>
            <strong className="text-foreground">Fire test events</strong> using the buttons above. Each click
            calls the corresponding <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">lib/analytics.ts</code>{' '}
            function with sample data.
          </li>
          <li>
            <strong className="text-foreground">Check GA4 Realtime:</strong> Go to Reports {'>'} Realtime.
            Events should appear within 5-30 seconds. Custom event names show under the{' '}
            {'"'}Event count by Event name{'"'} card.
          </li>
          <li>
            <strong className="text-foreground">Verify parameters:</strong> In DebugView, click on an event to
            see its custom parameters (venue_id, postcode, filter_name, domain, etc.).
          </li>
        </ol>
      </div>
    </div>
  )
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
      )}
      <div className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate font-mono text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}
