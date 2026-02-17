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

const VALID_INTENTS = new Set(Object.keys(INTENT_TYPES))

async function getSubpage(citySlug: string, subpage: string) {
  // Determine if this is an intent or area subpage
  const isIntent = VALID_INTENTS.has(subpage)
  const slug = `guides-${citySlug}-${subpage}`

  const rows = await sql`
    SELECT * FROM blog_posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
  `
  return { post: rows[0] || null, isIntent }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; subpage: string }>
}): Promise<Metadata> {
  const { city: citySlug, subpage } = await params
  const { post } = await getSubpage(citySlug, subpage)
  if (!post) return { title: 'Guide Not Found' }

  return {
    title: (post.meta_title as string) || (post.title as string),
    description: (post.meta_description as string) || (post.excerpt as string),
    alternates: {
      canonical: post.canonical_url as string || `/guides/${citySlug}/${subpage}`,
    },
    openGraph: {
      title: (post.og_title as string) || (post.meta_title as string) || (post.title as string),
      description: (post.og_description as string) || (post.meta_description as string) || '',
      type: 'article',
      publishedTime: post.published_at as string,
    },
  }
}

export default async function GuideSubpage({
  params,
}: {
  params: Promise<{ city: string; subpage: string }>
}) {
  const { city: citySlug, subpage } = await params
  const { post, isIntent } = await getSubpage(citySlug, subpage)
  if (!post) notFound()

  const city = (post.city as string) || citySlug.replace(/-/g, ' ')
  const area = post.area as string | undefined
  const subpageLabel = isIntent
    ? (INTENT_TYPES[subpage as keyof typeof INTENT_TYPES]?.label || subpage)
    : (area || subpage.replace(/-/g, ' '))
  const faqs = post.faq_json ? (typeof post.faq_json === 'string' ? JSON.parse(post.faq_json as string) : post.faq_json) : []
  const publishedDate = post.published_at
    ? new Date(post.published_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // JSON-LD schemas
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'Softplay UK',
      url: 'https://www.softplayuk.co.uk',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.softplayuk.co.uk/guides/${citySlug}/${subpage}`,
    },
  }

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

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.softplayuk.co.uk' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://www.softplayuk.co.uk/blog' },
      { '@type': 'ListItem', position: 3, name: city, item: `https://www.softplayuk.co.uk/guides/${citySlug}` },
      { '@type': 'ListItem', position: 4, name: subpageLabel },
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
            <li>
              <Link href={`/guides/${citySlug}`} className="transition-colors hover:text-foreground">
                {city}
              </Link>
            </li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground line-clamp-1">{subpageLabel}</li>
          </ol>
        </nav>

        <article className="mx-auto max-w-4xl px-4 pb-16">
          <header className="mb-10">
            <h1 className="mb-4 font-serif text-3xl font-bold text-balance text-foreground md:text-4xl lg:text-5xl">
              {post.title as string}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {publishedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {publishedDate}
                </span>
              )}
              {post.word_count && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.ceil(Number(post.word_count) / 200)} min read
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {area ? `${area}, ` : ''}{city}
              </span>
            </div>
            {post.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {post.excerpt as string}
              </p>
            )}
          </header>

          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content as string) }}
          />

          {/* Browse CTA */}
          <div className="mt-12 rounded-2xl border border-border bg-primary/5 p-6 text-center">
            <h3 className="mb-2 font-serif text-xl font-bold text-foreground">
              Browse and compare venues in {city}
            </h3>
            <p className="mb-4 text-muted-foreground">
              See all listings with parent reviews, facilities, and opening hours.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/soft-play/${citySlug}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse {city} venues
              </Link>
              <Link
                href={`/guides/${citySlug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {city} city guide
              </Link>
            </div>
          </div>

          <RelatedGuides city={city} citySlug={citySlug} currentSlug={post.slug as string} />
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
