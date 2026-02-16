import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VenueCard } from '@/components/venue-card'
import { PostcodeSearch } from '@/components/postcode-search'
import { neon } from '@neondatabase/serverless'
import { hydrateVenue, fetchVenueRelations } from '@/lib/db'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

const CATEGORY_MAP: Record<string, { db: string; label: string; plural: string; description: string }> = {
  'soft-play': {
    db: 'soft_play',
    label: 'Soft Play Centre',
    plural: 'Soft Play Centres',
    description: 'Indoor soft play centres with ball pits, climbing frames, slides, and dedicated baby and toddler areas. Perfect for rainy days and birthday parties.',
  },
  'playground': {
    db: 'playground',
    label: 'Public Playground',
    plural: 'Public Playgrounds',
    description: 'Free outdoor playgrounds and play areas across the UK. From local parks to destination playgrounds with climbing walls, zip lines, and water play.',
  },
  'trampoline-park': {
    db: 'trampoline_park',
    label: 'Trampoline Park',
    plural: 'Trampoline Parks',
    description: 'Bounce, flip, and jump at trampoline parks across the UK. Great for active kids and teenagers, with foam pits, dodgeball courts, and ninja courses.',
  },
  'adventure': {
    db: 'adventure',
    label: 'Adventure Play',
    plural: 'Adventure Play Centres',
    description: 'Adventure play centres with climbing walls, high ropes, ninja courses, and obstacle challenges. Ideal for older children who want more than soft play.',
  },
  'farm': {
    db: 'farm',
    label: 'Farm Park',
    plural: 'Farm Parks',
    description: 'Family-friendly farm parks with animals, outdoor play areas, tractor rides, and indoor play barns. A great full-day out for the whole family.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = CATEGORY_MAP[category]
  if (!cat) return { title: 'Not Found' }

  return {
    title: `Best ${cat.plural} in the UK`,
    description: `Find the best ${cat.plural.toLowerCase()} near you. Browse our directory of UK ${cat.plural.toLowerCase()} with real parent reviews, photos, and opening hours.`,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category: categorySlug } = await params
  const cat = CATEGORY_MAP[categorySlug]
  if (!cat) notFound()

  const [venuesRaw, regionsRaw] = await Promise.all([
    sql`SELECT * FROM venues WHERE status = 'active' AND category = ${cat.db} ORDER BY google_rating DESC NULLS LAST, name ASC LIMIT 60`,
    sql`SELECT county, LOWER(REPLACE(REPLACE(county, ' ', '-'), '''', '')) as slug, COUNT(*) as cnt FROM venues WHERE status = 'active' AND category = ${cat.db} AND county IS NOT NULL AND county != '' GROUP BY county ORDER BY cnt DESC LIMIT 15`,
  ])

  const venues = []
  for (const row of venuesRaw) {
    const { images, hours, sources } = await fetchVenueRelations(Number(row.id))
    venues.push(hydrateVenue(row, images, hours, sources))
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <nav className="mx-auto max-w-6xl px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li>
              <Link href="/blog" className="transition-colors hover:text-foreground">Guides</Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground">{cat.plural}</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="mb-8 rounded-2xl border border-border bg-card p-8 md:p-12">
            <h1 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
              Best {cat.plural} in the UK
            </h1>
            <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
              {cat.description}
            </p>
            <p className="mb-6 text-sm font-medium text-primary">
              {venues.length} {cat.plural.toLowerCase()} found
            </p>
            <div className="max-w-lg">
              <PostcodeSearch size="sm" />
            </div>
          </div>

          {/* Regions with this category */}
          {regionsRaw.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-serif text-xl font-bold text-foreground">
                {cat.plural} by region
              </h2>
              <div className="flex flex-wrap gap-3">
                {regionsRaw.map((r) => (
                  <Link
                    key={r.slug as string}
                    href={`/regions/${r.slug as string}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    {r.county as string}
                    <span className="text-xs text-muted-foreground">({Number(r.cnt)})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Venue grid */}
          {venues.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="mb-2 font-serif text-xl font-bold text-foreground">Coming soon</h2>
              <p className="text-muted-foreground">
                We are currently adding {cat.plural.toLowerCase()} to our directory. Check back soon.
              </p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
