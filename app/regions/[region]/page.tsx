import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VenueCard } from '@/components/venue-card'
import { PostcodeSearch } from '@/components/postcode-search'
import { getRegionDetail, getVenuesByRegion, getAllRegions } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>
}): Promise<Metadata> {
  const { region } = await params
  const detail = await getRegionDetail(region)
  if (!detail) return { title: 'Region Not Found' }

  return {
    title: `Soft Play Centres in ${detail.region} - Indoor Play Areas`,
    description: `Find the best soft play centres in ${detail.region}. Browse ${detail.venueCount} venues across ${detail.cityCount} cities with trusted parent reviews.`,
    alternates: {
      canonical: `/regions/${region}`,
    },
    openGraph: {
      title: `Soft Play in ${detail.region}`,
      description: `${detail.venueCount} soft play centres across ${detail.cityCount} cities in ${detail.region}.`,
      url: `/regions/${region}`,
    },
  }
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region: regionSlug } = await params
  const detail = await getRegionDetail(regionSlug)
  if (!detail) notFound()

  const venues = await getVenuesByRegion(regionSlug, 30)

  let allRegions: { region: string; slug: string; venueCount: number; cityCount: number }[] = []
  try {
    allRegions = await getAllRegions()
  } catch {
    // ignore
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <nav className="mx-auto max-w-6xl px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
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
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground">{detail.region}</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-6xl px-4 pb-10">
          {/* Header */}
          <div className="mb-8 rounded-2xl border border-border bg-card p-8 md:p-12">
            <div className="mb-3 flex items-center gap-2 text-sm text-primary">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{detail.region}</span>
            </div>
            <h1 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
              Soft Play Centres in {detail.region}
            </h1>
            <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
              {detail.venueCount > 0
                ? `Explore ${detail.venueCount} soft play centre${detail.venueCount !== 1 ? 's' : ''} across ${detail.cityCount} ${detail.cityCount === 1 ? 'city' : 'cities'} in ${detail.region}. Browse by city below, or search by postcode to find the nearest venues.`
                : `We are currently adding soft play centres in ${detail.region}. Check back soon or search by postcode to find nearby venues.`}
            </p>
            <div className="max-w-lg">
              <PostcodeSearch size="sm" />
            </div>
          </div>

          {/* Cities in this region */}
          {detail.cities.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
                Cities in {detail.region}
              </h2>
              <div className="flex flex-wrap gap-3">
                {detail.cities.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/soft-play/${c.slug}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    {c.city}
                    <span className="text-xs text-muted-foreground">({c.venueCount})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top venues */}
          {venues.length > 0 ? (
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
                Top venues in {detail.region}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="mb-2 font-serif text-xl font-bold text-foreground">Coming soon</h2>
              <p className="text-muted-foreground">
                We are currently adding soft play centres in {detail.region}. Check back soon or search by postcode.
              </p>
            </div>
          )}

          {/* SEO + cross-links */}
          <section className="mt-12 rounded-2xl border border-border bg-secondary/30 p-8">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">
              About soft play in {detail.region}
            </h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              {detail.region} is home to a variety of indoor play centres catering to children of all ages.
              Whether you are looking for adventure frames for older children or gentle sensory areas for babies
              and toddlers, Softplay UK helps you find the right venue with real parent reviews
              and up-to-date information.
            </p>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Explore other regions</h3>
              <div className="flex flex-wrap gap-2">
                {allRegions
                  .filter((r) => r.slug !== regionSlug)
                  .slice(0, 20)
                  .map((r) => (
                    <Link
                      key={r.slug}
                      href={`/regions/${r.slug}`}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      {r.region}
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
