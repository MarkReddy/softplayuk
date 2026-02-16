'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

function StarSelector({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-0.5" role="radiogroup" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hover || value)
                  ? 'fill-accent text-accent'
                  : 'fill-muted text-border'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function LeaveReviewForm({ venueId, venueName }: { venueId: string; venueName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [cleanlinessRating, setCleanlinessRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)
  const [funRating, setFunRating] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || rating === 0 || !comment.trim()) {
      setError('Please fill in your name, overall rating, and a comment.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          authorName: name.trim(),
          rating,
          body: comment.trim(),
          cleanlinessRating: cleanlinessRating || null,
          valueRating: valueRating || null,
          funRating: funRating || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit review')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="mb-2 font-serif text-lg font-bold text-foreground">Thank you for your review!</h3>
        <p className="text-sm text-muted-foreground">
          Your review of {venueName} has been submitted and will appear shortly.
        </p>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl"
        size="lg"
      >
        <Star className="h-4 w-4" />
        Leave a review
      </Button>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 font-serif text-lg font-bold text-foreground">
        Review {venueName}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reviewer-name" className="mb-1 block text-sm font-medium text-foreground">
            Your name
          </label>
          <input
            id="reviewer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarah M."
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <StarSelector value={rating} onChange={setRating} label="Overall" />
          <StarSelector value={cleanlinessRating} onChange={setCleanlinessRating} label="Cleanliness" />
          <StarSelector value={valueRating} onChange={setValueRating} label="Value" />
          <StarSelector value={funRating} onChange={setFunRating} label="Fun factor" />
        </div>

        <div>
          <label htmlFor="review-comment" className="mb-1 block text-sm font-medium text-foreground">
            Your review
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell other parents about your experience..."
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={1000}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1 rounded-xl">
            {submitting ? 'Submitting...' : 'Submit review'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
