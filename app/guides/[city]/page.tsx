import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import { neon } from '@neondatabase/serverless'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { RelatedGuides } from '@/components/related-guides'
import { renderMarkdown } from '@/lib/render-markdown'
import { INTENT_TYPES } from '@/lib/blog-prompts'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

async function getGuide(citySlug: string) {
  // Try the new guides-* slug format first, then fall back to old format
  const rows = await sql`
    SELECT * FROM blog_posts
    WHERE (slug = ${'guides-' + citySlug} OR slug = ${'best-soft-play-in-' + citySlug})
      AND status = 'published'
    ORDER BY CASE WHEN slug = ${'guides-' + citySlug} THEN 0 ELSE 1 END
    LIMIT 1
  `
  return rows[0] || null
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params
  const guide = await getGuide(citySlug)
  if (!guide) return { title: 'Guide Not Found' }

  return {
    title: (guide.meta_title as string) || (guide.title as string),
    description: (guide.meta_description as string) || (guide.excerpt as string),
    alternates: {
      canonical: guide.canonical_url as string || `/guides/${citySlug}`,
    },
    openGraph: {
      title: (guide.og_title as string) || (guide.meta_title as string) || (guide.title as string),
      description: (guide.og_description as string) || (guide.meta_description as string) || '',
      type: 'article',
      publishedTime: guide.published_at as string,
    },
  }
}

export default async function CityGuidePage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params
  const guide = await getGuide(citySlug)
  if (!guide) notFound()

  const city = (guide.city as string) || citySlug.replace(/-/g, ' ')
  const faqs = guide.faq_json ? (typeof guide.faq_json === 'string' ? JSON.parse(guide.faq_json as string) : guide.faq_json) : []
  const publishedDate = guide.published_at
    ? new Date(guide.published_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // JSON-LD: Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.meta_description || guide.excerpt,
    datePublished: guide.published_at,
    dateModified: guide.updated_at || guide.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'Softplay UK',
      url: 'https://www.softplayuk.co.uk',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.softplayuk.co.uk/guides/${citySlug}`,
    },
  }

  // JSON-LD: FAQPage schema
  const faqSchema = Array.isArray(faqs) && faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq: { question: string; answer: string }) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null

  // JSON-LD: BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.softplayuk.co.uk' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://www.softplayuk.co.uk/blog' },
      { '@type': 'ListItem', position: 3, name: guide.title },
    ],
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

        <nav className="mx-auto max-w-4xl px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li><Link href="/" className="transition-colors hover:text-foreground">Home</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link href="/blog" className="transition-colors hover:text-foreground">Guides</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground line-clamp-1">{city}</li>
          </ol>
        </nav>

        <article className="mx-auto max-w-4xl px-4 pb-16">
          <header className="mb-10">
            <h1 className="mb-4 font-serif text-3xl font-bold text-balance text-foreground md:text-4xl lg:text-5xl">
              {guide.title as string}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {publishedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {publishedDate}
                </span>
              )}
              {guide.word_count && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.ceil(Number(guide.word_count) / 200)} min read
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {city}{guide.region ? `, ${guide.region}` : ''}
              </span>
            </div>
            {guide.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {guide.excerpt as string}
              </p>
            )}
          </header>

          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.content as string) }}
          />

          {/* Browse CTA */}
          <div className="mt-12 rounded-2xl border border-border bg-primary/5 p-6 text-center">
            <h3 className="mb-2 font-serif text-xl font-bold text-foreground">
              Find your perfect play venue in {city}
            </h3>
            <p className="mb-4 text-muted-foreground">
              Browse all venues in {city} with trusted parent reviews, photos, and opening hours.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/soft-play/${citySlug}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse {city} venues
              </Link>
              {guide.region && (
                <Link
                  href={`/regions/${(guide.region as string).toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Browse {guide.region as string}
                </Link>
              )}
            </div>
          </div>

          {/* Related Guides */}
          <RelatedGuides city={city} citySlug={citySlug} currentSlug={guide.slug as string} />
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
