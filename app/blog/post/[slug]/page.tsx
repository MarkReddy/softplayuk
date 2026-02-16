import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import { neon } from '@neondatabase/serverless'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

async function getPost(slug: string) {
  const rows = await sql`
    SELECT * FROM blog_posts WHERE slug = ${slug} AND status = 'published'
  `
  return rows[0] || null
}

async function getRelatedPosts(post: Record<string, unknown>) {
  const rows = await sql`
    SELECT slug, title, excerpt, city, region, published_at
    FROM blog_posts
    WHERE status = 'published' AND id != ${post.id as number}
    ORDER BY
      CASE WHEN region = ${post.region as string} THEN 0 ELSE 1 END,
      published_at DESC
    LIMIT 3
  `
  return rows
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: (post.meta_title as string) || (post.title as string),
    description: (post.meta_description as string) || (post.excerpt as string),
    openGraph: {
      title: (post.meta_title as string) || (post.title as string),
      description: (post.meta_description as string) || (post.excerpt as string),
      type: 'article',
      publishedTime: post.published_at as string,
    },
  }
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="mt-8 mb-3 font-serif text-lg font-bold text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-10 mb-4 font-serif text-2xl font-bold text-foreground">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>')
    .replace(/^(?!<[hula])(.*\S.*)$/gm, '<p class="mb-4 leading-relaxed text-muted-foreground">$1</p>')
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const related = await getRelatedPosts(post)
  const publishedDate = post.published_at
    ? new Date(post.published_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    publisher: {
      '@type': 'Organization',
      name: 'Softplay UK',
      url: 'https://www.softplayuk.co.uk',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.softplayuk.co.uk/blog/post/${post.slug}`,
    },
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav className="mx-auto max-w-4xl px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li><Link href="/" className="transition-colors hover:text-foreground">Home</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link href="/blog" className="transition-colors hover:text-foreground">Guides</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="font-medium text-foreground line-clamp-1">{post.title as string}</li>
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
              {(post.city || post.region) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {[post.city, post.region].filter(Boolean).join(', ')}
                </span>
              )}
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

          <div className="mt-12 rounded-2xl border border-border bg-primary/5 p-6 text-center">
            <h3 className="mb-2 font-serif text-xl font-bold text-foreground">
              Find your perfect play venue
            </h3>
            <p className="mb-4 text-muted-foreground">
              Browse {post.city ? `all venues in ${post.city}` : `venues across ${post.region || 'the UK'}`} with trusted parent reviews.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {post.city && (
                <Link
                  href={`/soft-play/${(post.city as string).toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Browse {post.city as string}
                </Link>
              )}
              {post.region && (
                <Link
                  href={`/regions/${(post.region as string).toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Browse {post.region as string}
                </Link>
              )}
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">More guides</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug as string}
                    href={`/blog/post/${r.slug}`}
                    className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                  >
                    <h3 className="mb-2 font-serif text-base font-bold text-foreground transition-colors group-hover:text-primary line-clamp-2">
                      {r.title as string}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {r.excerpt as string}
                    </p>
                    {r.published_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(r.published_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
