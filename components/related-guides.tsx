import Link from 'next/link'
import { MapPin, Tag } from 'lucide-react'
import { neon } from '@neondatabase/serverless'
import { INTENT_TYPES } from '@/lib/blog-prompts'

const sql = neon(process.env.DATABASE_URL!)

interface RelatedGuidesProps {
  city: string
  citySlug: string
  currentSlug: string
}

export async function RelatedGuides({ city, citySlug, currentSlug }: RelatedGuidesProps) {
  // Fetch related content: area guides + intent pages for this city, and nearby city guides
  const [areaGuides, intentPages, nearbyGuides] = await Promise.all([
    sql`
      SELECT slug, title, area, content_type FROM blog_posts
      WHERE status = 'published' AND content_type = 'area' AND LOWER(city) = LOWER(${city}) AND slug != ${currentSlug}
      ORDER BY created_at DESC LIMIT 3
    `,
    sql`
      SELECT slug, title, intent, content_type FROM blog_posts
      WHERE status = 'published' AND content_type = 'intent' AND LOWER(city) = LOWER(${city}) AND slug != ${currentSlug}
      ORDER BY created_at DESC LIMIT 5
    `,
    sql`
      SELECT slug, title, city, content_type FROM blog_posts
      WHERE status = 'published' AND content_type = 'city' AND LOWER(city) != LOWER(${city}) AND slug != ${currentSlug}
      ORDER BY created_at DESC LIMIT 3
    `,
  ])

  const hasContent = areaGuides.length > 0 || intentPages.length > 0 || nearbyGuides.length > 0

  // Build list of available intent pages for this city
  const publishedIntents = new Set(intentPages.map(p => p.intent as string))
  // Also show intent links that don't have pages yet (they'll lead to the city guide)
  const allIntents = Object.entries(INTENT_TYPES).slice(0, 5)

  if (!hasContent && allIntents.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Related guides</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Intent Pages */}
        {(intentPages.length > 0 || allIntents.length > 0) && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Tag className="h-3.5 w-3.5" />
              By topic in {city}
            </h3>
            <div className="space-y-2">
              {allIntents.map(([intentKey, intentConfig]) => {
                const hasPage = publishedIntents.has(intentKey)
                const href = hasPage
                  ? `/guides/${citySlug}/${intentKey}`
                  : `/guides/${citySlug}`
                return (
                  <Link
                    key={intentKey}
                    href={href}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {intentConfig.h1.replace('{City}', city)}
                    </span>
                    {!hasPage && (
                      <span className="ml-auto text-[10px] text-muted-foreground">Coming soon</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Area + Nearby City Guides */}
        <div>
          {areaGuides.length > 0 && (
            <>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5" />
                Areas in {city}
              </h3>
              <div className="mb-4 space-y-2">
                {areaGuides.map((guide) => (
                  <Link
                    key={guide.slug as string}
                    href={`/guides/${citySlug}/${(guide.area as string || '').toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {guide.title as string}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {nearbyGuides.length > 0 && (
            <>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5" />
                Nearby cities
              </h3>
              <div className="space-y-2">
                {nearbyGuides.map((guide) => (
                  <Link
                    key={guide.slug as string}
                    href={`/guides/${(guide.city as string || '').toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {guide.title as string}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
