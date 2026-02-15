import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PostcodeSearch } from '@/components/postcode-search'
import { getAllRegions } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse Soft Play by Region',
  description:
    'Explore soft play centres across every region of the United Kingdom. Find indoor play areas near you by browsing our regional directory.',
}

export default async function RegionsPage() {
  let regions: { region: string; slug: string; venueCount: number; cityCount: number }[] = []
  try {
    regions = await getAllRegions()
  } catch {
    // DB unavailable -- render empty
  }

  const totalVenues = regions.reduce((sum, r) => sum + r.venueCount, 0)

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
            <li className="font-medium text-foreground">Regions</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="mb-8 rounded-2xl border border-border bg-card p-8 md:p-12">
            <h1 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
              Browse soft play by region
            </h1>
            <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
              {totalVenues > 0
                ? `Discover ${totalVenues} soft play centres across ${regions.length} regions of the United Kingdom. Select a region to explore cities and venues near you.`
                : 'Explore soft play centres across the United Kingdom. We are actively adding venues in every region. Select a region to see what is available.'}
            </p>
            <div className="max-w-lg">
              <PostcodeSearch size="sm" />
            </div>
          </div>

          {regions.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map((r) => (
                <Link
                  key={r.slug}
                  href={`/regions/${r.slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {r.region}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.venueCount} venue{r.venueCount !== 1 ? 's' : ''}
                      {r.cityCount > 0 ? ` across ${r.cityCount} ${r.cityCount === 1 ? 'city' : 'cities'}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="mb-2 font-serif text-xl font-bold text-foreground">No regions yet</h2>
              <p className="text-muted-foreground">
                We are currently populating our database with soft play centres across the UK. Check back soon.
              </p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
