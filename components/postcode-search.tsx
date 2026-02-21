'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { isValidUKPostcode } from '@/lib/data'
import { trackPostcodeSearch } from '@/lib/analytics'

export function PostcodeSearch({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const [postcode, setPostcode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!postcode.trim()) {
      setError('Please enter a postcode')
      return
    }

    if (!isValidUKPostcode(postcode)) {
      setError('Please enter a valid UK postcode')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `/api/postcode?postcode=${encodeURIComponent(postcode.trim())}`,
      )
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Postcode not found')
        setLoading(false)
        return
      }

      trackPostcodeSearch(data.postcode, data.lat, data.lng)
      router.push(
        `/search?postcode=${encodeURIComponent(data.postcode)}&lat=${data.lat}&lng=${data.lng}`,
      )
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const isLarge = size === 'lg'

  return (
    <form onSubmit={handleSearch} className="w-full max-w-md">
      <div
        className={`flex items-center gap-2 rounded-full border border-border bg-card shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-md ${isLarge ? 'p-1.5 pl-5' : 'p-1 pl-4'}`}
      >
        <Search
          className={`shrink-0 text-muted-foreground ${isLarge ? 'h-5 w-5' : 'h-4 w-4'}`}
        />
        <input
          type="text"
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value.toUpperCase())
            if (error) setError('')
          }}
          placeholder="Enter your postcode..."
          className={`w-full border-0 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none ${isLarge ? 'py-2 text-base' : 'py-1.5 text-sm'}`}
          aria-label="UK postcode"
          autoComplete="postal-code"
        />
        <button
          type="submit"
          disabled={loading}
          className={`shrink-0 rounded-full bg-primary font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 ${isLarge ? 'h-11 px-6 text-sm' : 'h-9 px-5 text-xs'}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Explore'
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2.5 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
