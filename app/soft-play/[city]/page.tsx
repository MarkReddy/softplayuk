import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VenueCard } from '@/components/venue-card'
import { PostcodeSearch } from '@/components/postcode-search'
import { getCityPage, getVenuesByCity, getAllCityPages } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city } = await params
  const page = await getCityPage(city)
  if (!page) return { title: 'City Not Found' }

  return {
    title: `Soft Play Centres in ${page.city} - Best Indoor Play Areas`,
    description: page.description,
    openGraph: {
      title: `Soft Play Centres in ${page.city}`,
      description: page.description,
    },
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const page = await getCityPage(city)
  if (!page) notFound()

  const cityVenues = await getVenuesByCity(page.city)
  const allCityPages = await getAllCityPages()

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
            {page.area && (
              <>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li>
                  <Link
                    href={`/regions/${page.area.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {page.area}
                  </Link>
                </li>
              </>
            )}
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground">{page.city}</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="mb-8 rounded-2xl border border-border bg-card p-8 md:p-12">
            <div className="mb-3 flex items-center gap-2 text-sm text-primary">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{page.city}</span>
            </div>
            <h1 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
              Soft Play Centres in {page.city}
            </h1>
            <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
              {page.description}
            </p>
            <div className="max-w-lg">
              <PostcodeSearch size="sm" />
            </div>
          </div>

          {cityVenues.length > 0 ? (
            <>
              <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
                {cityVenues.length} venue{cityVenues.length !== 1 ? 's' : ''} in {page.city}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cityVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="mb-2 font-serif text-xl font-bold text-foreground">Coming soon</h2>
              <p className="text-muted-foreground">
                We are currently adding soft play centres in {page.city}. Check back soon or search by postcode.
              </p>
            </div>
          )}

          <section className="mt-12 rounded-2xl border border-border bg-secondary/30 p-8">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">
              Finding soft play in {page.city}
            </h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              {page.city} has a wonderful selection of indoor play centres suitable for children of all ages.
              Whether you are looking for a large adventure play world for older kids or a calm sensory space
              for your baby, Softplay UK makes it easy to compare venues, read genuine parent reviews,
              and find the best option for your family.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              All venues listed on Softplay UK are reviewed for cleanliness, safety, age-appropriate
              equipment, and value for money. Use the postcode search above to find the nearest soft play
              centres to you, or browse our curated list of {page.city}&apos;s best venues below.
            </p>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Explore other cities</h3>
              <div className="flex flex-wrap gap-2">
                {allCityPages
                  .filter((c) => c.slug !== city)
                  .slice(0, 30)
                  .map((c) => (
                    <Link
                      key={c.slug}
                      href={`/soft-play/${c.slug}`}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      Soft Play in {c.city}
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
