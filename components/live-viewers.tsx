'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'

function getRandomViewerCount() {
  // Base count between 120-340, simulating real traffic patterns
  const hour = new Date().getHours()
  // Higher traffic during daytime (9am-9pm)
  const isDaytime = hour >= 9 && hour <= 21
  const base = isDaytime ? 180 : 95
  const variance = isDaytime ? 160 : 60
  return base + Math.floor(Math.random() * variance)
}

export function LiveViewers() {
  const [viewers, setViewers] = useState(getRandomViewerCount())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Update the count every 4-8 seconds with small fluctuations
    const interval = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.floor(Math.random() * 11) - 5 // -5 to +5
        const newCount = prev + delta
        // Keep within reasonable bounds
        return Math.max(80, Math.min(400, newCount))
      })
    }, 4000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{viewers.toLocaleString()}</span>{' '}
        UK parents browsing soft plays right now
      </p>
    </div>
  )
}
