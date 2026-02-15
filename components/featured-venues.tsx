import { getFeaturedVenues } from '@/lib/db'
import { VenueCard } from './venue-card'

export async function FeaturedVenues() {
  let featured
  try {
    featured = await getFeaturedVenues()
  } catch (error) {
    console.error('[v0] FeaturedVenues DB error:', error)
    return null
  }

  if (featured.length === 0) return null

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-2 text-center font-serif text-3xl font-bold text-foreground">
          Featured venues
        </h2>
        <p className="mb-10 text-center text-muted-foreground">
          Hand-picked soft play centres loved by parents
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </section>
  )
}
