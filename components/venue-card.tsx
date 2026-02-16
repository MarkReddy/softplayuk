import Link from "next/link"
import { Star, Car, Coffee, Heart, PartyPopper, MapPin, Clock, Wifi, Baby, TreePine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Venue, SearchResult } from "@/lib/types"
import { getPriceBandLabel, getAgeLabel, getBlendedRating, getSourceLabel, getCategoryLabel, getCategoryStyle, isPublicArea } from "@/lib/data"

const amenityIcons: Record<string, React.ReactNode> = {
  car: <Car className="h-3.5 w-3.5" />,
  coffee: <Coffee className="h-3.5 w-3.5" />,
  heart: <Heart className="h-3.5 w-3.5" />,
  "party-popper": <PartyPopper className="h-3.5 w-3.5" />,
  wifi: <Wifi className="h-3.5 w-3.5" />,
  baby: <Baby className="h-3.5 w-3.5" />,
  tree: <TreePine className="h-3.5 w-3.5" />,
}

function isSearchResult(venue: Venue | SearchResult): venue is SearchResult {
  return "distance" in venue && (venue as SearchResult).distance > 0
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating)
              ? "fill-accent text-accent"
              : "fill-muted text-border"
          }`}
        />
      ))}
    </span>
  )
}

export function VenueCard({ venue }: { venue: Venue | SearchResult }) {
  console.log("[v0] VenueCard rendering with native img tags - no next/image")
  const blended = getBlendedRating(venue)
  const totalReviews = (venue.googleReviewCount || 0) + venue.firstPartyReviewCount

  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Image - native img, no next/image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={venue.imageUrl}
          alt={`${venue.name} soft play centre`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {venue.verified && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground text-xs">
            Verified
          </Badge>
        )}
        {venue.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-accent/90 px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground backdrop-blur-sm">
            Featured
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-card/70 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
          via {getSourceLabel(venue.sourcePriority)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-balance font-serif text-lg font-bold leading-tight text-foreground group-hover:text-primary">
            {venue.name}
          </h3>
          <div className="flex shrink-0 flex-col items-center rounded-xl bg-primary/10 px-2.5 py-1">
            <span className="text-base font-bold leading-none text-primary">
              {blended.toFixed(1)}
            </span>
            <span className="text-[9px] text-muted-foreground">blended</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StarRating rating={blended} />
          <span className="text-xs text-muted-foreground">
            {totalReviews} review{totalReviews !== 1 && "s"}
          </span>
          {venue.cleanlinessScore >= 4.5 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Spotless
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {venue.area}, {venue.city}
          </span>
          {isSearchResult(venue) && (
            <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
              {venue.distance.toFixed(1)} mi
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {venue.shortDescription}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={`text-xs font-medium ${getCategoryStyle(venue.primaryCategory).bg} ${getCategoryStyle(venue.primaryCategory).text} border-0`}>
            {getCategoryLabel(venue.primaryCategory)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {getAgeLabel(venue.ageRange.min, venue.ageRange.max)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {getPriceBandLabel(venue.priceBand)}
          </Badge>
          {venue.senFriendly && (
            <Badge variant="outline" className="border-primary/30 text-xs text-primary">
              SEN friendly
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {venue.amenities.slice(0, 4).map((amenity) => (
            <div
              key={amenity.id}
              className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
            >
              {amenityIcons[amenity.icon] || null}
              <span>{amenity.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {isPublicArea(venue.primaryCategory) && Object.values(venue.openingHours).every((h) => h === "Closed")
              ? "Open 24 hours"
              : venue.openingHours.monday === "Closed"
                ? "Closed Mondays"
                : `Mon ${venue.openingHours.monday}`}
          </span>
        </div>
      </div>
    </Link>
  )
}
