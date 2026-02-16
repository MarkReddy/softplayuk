export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PostcodeSearch } from '@/components/postcode-search'
import { HowItWorks } from '@/components/how-it-works'
import { TrustSignals } from '@/components/trust-signals'
import { PopularSearches } from '@/components/popular-searches'
import { FeaturedVenues } from '@/components/featured-venues'
import { VenuesNearYou } from '@/components/venues-near-you'
import { LiveViewers } from '@/components/live-viewers'

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero section */}
        <section className="relative overflow-hidden">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[hsl(var(--wash-peach))] opacity-50 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-[hsl(var(--wash-sage))] opacity-40 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-[hsl(var(--wash-lavender))] opacity-30 blur-3xl" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 pb-16 pt-16 md:flex-row md:items-center md:pb-20 md:pt-24">
            <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
              <h1 className="mb-5 max-w-md text-balance text-3xl font-bold leading-snug text-foreground md:text-4xl lg:text-[2.75rem]">
                Find the best soft play centres near you
              </h1>
              <p className="mb-8 max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">
                Trusted by over 40,000 parents across more than 2,000 venues.
                Find the best soft play centres near you.
              </p>
              <PostcodeSearch size="lg" />
              <p className="mt-4 text-xs text-muted-foreground/70">
                Enter any UK postcode to find soft play centres nearby
              </p>
            </div>

            <div className="relative flex-1">
              <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-[2rem] shadow-lg" style={{ borderRadius: '42% 58% 62% 38% / 45% 55% 45% 55%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-softplay.jpg"
                  alt="Children playing happily in a bright, colourful soft play centre"
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-[hsl(var(--wash-clay))]" />
              <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-[hsl(var(--wash-sage))]" />
            </div>
          </div>
        </section>

        <TrustSignals />
        <LiveViewers />
        <VenuesNearYou />
        <HowItWorks />
        <FeaturedVenues />
        <PopularSearches />

        <section className="relative overflow-hidden py-20">
          <div className="absolute -right-40 top-0 h-72 w-72 rounded-full bg-[hsl(var(--wash-lavender))] opacity-30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl px-5 text-center">
            <h2 className="mb-5 text-2xl font-bold text-foreground">
              The UK&apos;s most comprehensive soft play and children&apos;s activity site
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              SoftPlay UK is trusted by over 40,000 parents across more than
              2,000 venues. Whether you&apos;re looking for a toddler-friendly
              space, a large adventure play world, or a calm sensory-friendly
              venue, we&apos;ve got you covered.
            </p>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Every venue is reviewed by real parents who care about the same
              things you do: cleanliness, safety, age-appropriate equipment, and
              good coffee. Our verified reviews and detailed facility guides
              help you make the best choice for your family.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find the best soft play centres near you
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
