import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, MapPin, Tag } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PostcodeSearch } from '@/components/postcode-search'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

export const metadata: Metadata = {
  title: 'Soft Play Guides & Articles',
  description:
    'Expert guides for UK parents: discover the best soft play centres, trampoline parks, adventure play areas, and outdoor playgrounds region by region.',
}

interface RegionSummary {
  county: string
  slug: string
  cnt: number
}
interface CategorySummary {
  category: string
  cnt: number
}
interface CitySummary {
  city: string
  slug: string
  cnt: number
}

function getCatLabel(cat: string) {
  switch (cat) {
    case 'soft_play': return 'Soft Play Centres'
    case 'playground': return 'Public Playgrounds'
    case 'trampoline_park': return 'Trampoline Parks'
    case 'adventure': return 'Adventure Play'
    case 'farm': return 'Farm Parks'
    default: return 'Other Venues'
  }
}

function getCatSlug(cat: string) {
  return cat.replace(/_/g, '-')
}

export default async function BlogPage() {
  const [regionsRaw, categoriesRaw, citiesRaw, totalRow, publishedPosts] = await Promise.all([
    sql`SELECT county, LOWER(REPLACE(REPLACE(county, ' ', '-'), '''', '')) as slug, COUNT(*) as cnt FROM venues WHERE status = 'active' AND county IS NOT NULL AND county != '' GROUP BY county ORDER BY cnt DESC LIMIT 20`,
    sql`SELECT category, COUNT(*) as cnt FROM venues WHERE status = 'active' GROUP BY category ORDER BY cnt DESC`,
    sql`SELECT city, LOWER(REPLACE(REPLACE(city, ' ', '-'), '''', '')) as slug, COUNT(*) as cnt FROM venues WHERE status = 'active' AND city IS NOT NULL AND city != '' GROUP BY city, LOWER(REPLACE(REPLACE(city, ' ', '-'), '''', '')) ORDER BY cnt DESC LIMIT 20`,
    sql`SELECT COUNT(*) as cnt FROM venues WHERE status = 'active'`,
    sql`SELECT slug, title, excerpt, city, region, content_type, intent, area, canonical_url, word_count, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 12`,
  ])

  const regions = regionsRaw as unknown as RegionSummary[]
  const categories = categoriesRaw as unknown as CategorySummary[]
  const cities = citiesRaw as unknown as CitySummary[]
  const totalVenues = Number(totalRow[0]?.cnt) || 0

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
            <li className="font-medium text-foreground">Guides</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          {/* Hero */}
          <div className="mb-10 rounded-2xl border border-border bg-card p-8 md:p-12">
            <h1 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
              Soft Play Guides for UK Parents
            </h1>
            <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
              Browse {totalVenues.toLocaleString()} venues across the UK by region, city, or type.
              Every listing includes real parent reviews, opening hours, facilities, and photos.
            </p>
            <div className="max-w-lg">
              <PostcodeSearch size="sm" />
            </div>
          </div>

          {/* Published Articles */}
          {publishedPosts.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
                Latest guides
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publishedPosts.map((post) => {
                  const href = (post.canonical_url as string) || `/blog/post/${post.slug}`
                  return (
                  <Link
                    key={post.slug as string}
                    href={href}
                    className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <h3 className="mb-2 font-serif text-base font-bold text-foreground transition-colors group-hover:text-primary line-clamp-2">
                      {post.title as string}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt as string}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {post.city && <span>{post.city as string}</span>}
                      <span>{Math.ceil(Number(post.word_count) / 200)} min read</span>
                      {post.published_at && (
                        <span>{new Date(post.published_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      )}
                    </div>
                  </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Browse by Category */}
          <section className="mb-10">
            <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
              Browse by type
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.category}
                  href={`/blog/${getCatSlug(cat.category)}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {getCatLabel(cat.category)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {Number(cat.cnt)} venues across the UK
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Top Regions */}
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                Top regions
              </h2>
              <Link href="/regions" className="text-sm font-medium text-primary hover:underline">
                View all regions
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {regions.map((r) => (
                <Link
                  key={r.slug}
                  href={`/regions/${r.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {r.county}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">({Number(r.cnt)})</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Top Cities */}
          <section className="mb-10">
            <h2 className="mb-4 font-serif text-2xl font-bold text-foreground">
              Popular cities
            </h2>
            <div className="flex flex-wrap gap-3">
              {cities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/soft-play/${c.slug}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  {c.city}
                  <span className="ml-1.5 text-xs text-muted-foreground">({Number(c.cnt)})</span>
                </Link>
              ))}
            </div>
          </section>

          {/* SEO copy */}
          <section className="rounded-2xl border border-border bg-secondary/30 p-8">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">
              Your guide to children's play in the UK
            </h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Softplay UK is the country's most comprehensive directory of children's play venues.
              From indoor soft play centres with ball pits and climbing frames to outdoor adventure
              playgrounds and trampoline parks, we help parents find safe, clean, and fun places
              for their little ones.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Every venue is reviewed for cleanliness, safety, age-appropriate equipment, and value
              for money. We combine data from Google reviews with first-hand parent reports to give
              you the most complete picture before you visit.
            </p>
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
