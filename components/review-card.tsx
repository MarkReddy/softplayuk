import { Star, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Review } from '@/lib/types'

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${i < rating ? 'fill-accent text-accent' : 'fill-muted text-border'}`}
        />
      ))}
    </div>
  )
}

export function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt)
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const isGoogle = review.source === 'google'

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-serif text-sm font-bold text-primary">
            {review.userName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {review.userName}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
              {isGoogle && (
                <Badge variant="outline" className="h-4 border-border px-1.5 text-[10px] text-muted-foreground">
                  via Google
                </Badge>
              )}
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="md" />
      </div>

      {/* Comment */}
      <p className="mb-4 text-sm leading-relaxed text-foreground">
        {review.comment}
      </p>

      {/* Sub-ratings (first-party only) */}
      {!isGoogle && (review.cleanlinessRating || review.valueRating || review.ageSuitabilityRating) && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {review.cleanlinessRating != null && (
            <div className="flex items-center gap-1">
              <span>Cleanliness:</span>
              <StarRating rating={review.cleanlinessRating} />
            </div>
          )}
          {review.valueRating != null && (
            <div className="flex items-center gap-1">
              <span>Value:</span>
              <StarRating rating={review.valueRating} />
            </div>
          )}
          {review.ageSuitabilityRating != null && (
            <div className="flex items-center gap-1">
              <span>Age suitability:</span>
              <StarRating rating={review.ageSuitabilityRating} />
            </div>
          )}
        </div>
      )}

      {/* Helpful count */}
      {review.helpful > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>
            {review.helpful} {review.helpful === 1 ? 'parent' : 'parents'} found
            this helpful
          </span>
        </div>
      )}
    </div>
  )
}

export { StarRating }
