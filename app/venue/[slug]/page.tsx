import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  Car,
  Coffee,
  Heart,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Share2,
  Wifi,
  Baby,
  TreePine,
  Info,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VenueGallery } from '@/components/venue-gallery'
import { ReviewCard } from '@/components/review-card'
import { LeaveReviewForm } from '@/components/leave-review-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getVenueBySlug, getVenueReviews } from '@/lib/db'
import { getPriceBandLabel, getAgeLabel, getBlendedRating, getSourceLabel, getCategoryLabel, getCategoryStyle, isPublicArea } from '@/lib/data'

const amenityIconMap: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  coffee: <Coffee className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  'party-popper': <PartyPopper className="h-4 w-4" />,
  wifi: <Wifi className="h-4 w-4" />,
  baby: <Baby className="h-4 w-4" />,
  tree: <TreePine className="h-4 w-4" />,
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)
  if (!venue) return { title: 'Venue Not Found' }

  return {
    title: `${venue.name} - Soft Play in ${venue.city}`,
    description: venue.shortDescription,
    openGraph: {
      title: `${venue.name} - Soft Play in ${venue.city}`,
      description: venue.shortDescription,
      images: [venue.imageUrl],
    },
  }
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)
  if (!venue) notFound()

  const allReviews = await getVenueReviews(venue.id)
  const firstPartyReviews = allReviews.filter((r) => r.source === 'first_party')
  const googleReviews = allReviews.filter((r) => r.source === 'google')
  const blended = getBlendedRating(venue)
  const totalReviews = (venue.googleReviewCount || 0) + venue.firstPartyReviewCount
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        {/* Breadcrumb */}
        <nav className="mx-auto max-w-6xl px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li>
              <Link href="/regions" className="transition-colors hover:text-foreground">
                Regions
              </Link>
            </li>
            {venue.area && (
              <>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li>
                  <Link
                    href={`/regions/${venue.area.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {venue.area}
                  </Link>
                </li>
              </>
            )}
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li>
              <Link
                href={`/soft-play/${venue.city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                className="transition-colors hover:text-foreground"
              >
                {venue.city}
              </Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground">{venue.name}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-6xl px-4 pb-16">
          {/* Gallery */}
          <VenueGallery images={venue.images} name={venue.name} fallbackImage={venue.imageUrl} />

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Badges */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className={`gap-1 font-medium border-0 ${getCategoryStyle(venue.primaryCategory).bg} ${getCategoryStyle(venue.primaryCategory).text}`}>
                  {getCategoryLabel(venue.primaryCategory)}
                </Badge>
                {venue.verified && (
                  <Badge className="gap-1 bg-primary text-primary-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    Verified venue
                  </Badge>
                )}
                {venue.featured && (
                  <Badge className="gap-1 bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
                {venue.senFriendly && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                    <Heart className="h-3 w-3" />
                    SEN friendly
                  </Badge>
                )}
                <Badge variant="secondary">{getAgeLabel(venue.ageRange.min, venue.ageRange.max)}</Badge>
                <Badge variant="secondary">{getPriceBandLabel(venue.priceBand)}</Badge>
              </div>

              {/* Title */}
              <h1 className="mb-3 font-serif text-3xl font-bold text-foreground md:text-4xl">
                {venue.name}
              </h1>

              {/* Rating row */}
              <div className="mb-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="text-xl font-bold text-foreground">
                    {blended.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({totalReviews} reviews)
                  </span>
                </div>
                {venue.cleanlinessScore > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Cleanliness: {(venue.cleanlinessScore / 2).toFixed(1)}/5</span>
                  </div>
                )}
              </div>

              {/* Split ratings */}
              <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {venue.googleRating != null && (
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    Google {venue.googleRating.toFixed(1)} ({venue.googleReviewCount})
                  </span>
                )}
                {venue.firstPartyReviewCount > 0 && (
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    Parents {venue.firstPartyRating.toFixed(1)} ({venue.firstPartyReviewCount})
                  </span>
                )}
              </div>

              {/* Address */}
              <div className="mb-6 flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{venue.address}, {venue.postcode}</span>
              </div>

              {/* About */}
              <div className="mb-8 rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">About</h2>
                <p className="leading-relaxed text-muted-foreground">{venue.description}</p>
              </div>

              {/* Facilities */}
              <div className="mb-8 rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-xl font-bold text-foreground">Facilities</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {venue.amenities.map((amenity) => (
                    <div key={amenity.id} className="flex items-center gap-2.5 rounded-xl bg-secondary p-3">
                      <div className="text-primary">{amenityIconMap[amenity.icon] || <ShieldCheck className="h-4 w-4" />}</div>
                      <span className="text-sm font-medium text-foreground">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data provenance */}
              <div className="mb-8 rounded-2xl border border-border bg-secondary/50 p-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Where does this data come from?
                </h3>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  We compile information from multiple sources to give you the most complete picture.
                  Ratings combine Google reviews with first-hand parent reports from our community.
                </p>
                <div className="flex flex-wrap gap-2">
                  {venue.sources.map((s, i) => (
                    <span key={i} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {s.attribution || getSourceLabel(s.source)}
                      {s.lastFetchedAt && (
                        <span className="ml-1 text-muted-foreground/60">
                          (updated {new Date(s.lastFetchedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="mb-4 font-serif text-xl font-bold text-foreground">
                  Parent reviews ({allReviews.length})
                </h2>

                {firstPartyReviews.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">From our community</h3>
                    {firstPartyReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}

                {googleReviews.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">From Google</h3>
                    {googleReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}

                {allReviews.length === 0 && (
                  <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
                    No reviews yet. Be the first parent to review this venue!
                  </p>
                )}

                <div className="mt-6">
                  <LeaveReviewForm venueId={venue.id} venueName={venue.name} />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="space-y-3">
                    {venue.phone && (
                      <Button asChild className="w-full rounded-xl" size="lg">
                        <a href={`tel:${venue.phone}`}>
                          <Phone className="h-4 w-4" />
                          Call {venue.phone}
                        </a>
                      </Button>
                    )}
                    {venue.website && (
                      <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
                        <a href={venue.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                          Visit website
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4" />
                        Get directions
                      </a>
                    </Button>
                    <Button variant="ghost" className="w-full rounded-xl" size="lg">
                      <Share2 className="h-4 w-4" />
                      Share venue
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Opening hours
                  </h3>
                  {isPublicArea(venue.primaryCategory) && Object.values(venue.openingHours).every((h) => h === 'Closed') ? (
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Open 24 hours -- public access
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {days.map((day) => (
                        <li key={day} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-muted-foreground">{day}</span>
                          <span className={`font-medium ${venue.openingHours[day] === 'Closed' ? 'text-destructive' : 'text-foreground'}`}>
                            {venue.openingHours[day]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    Location
                  </h3>
                  <p className="mb-1 text-sm font-medium text-foreground">{venue.address}</p>
                  <p className="mb-4 text-sm text-muted-foreground">{venue.postcode}</p>
                  <Button asChild variant="outline" className="w-full rounded-xl" size="lg">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ', ' + venue.postcode)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                  </Button>
                </div>

                {venue.lastRefreshedAt && venue.lastRefreshedAt !== 'undefined' && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Data last refreshed{' '}
                    {new Date(venue.lastRefreshedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
