export const dynamic = 'force-dynamic'

import Image from 'next/image'
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
        {/* Hero — split layout: left message, right warm imagery */}
        <section className="relative overflow-hidden">
          {/* Organic pastel blobs */}
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[hsl(var(--wash-peach))] opacity-50 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-[hsl(var(--wash-sage))] opacity-40 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-[hsl(var(--wash-lavender))] opacity-30 blur-3xl" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 pb-16 pt-16 md:flex-row md:items-center md:pb-20 md:pt-24">
            {/* Left: message */}
            <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
              <h1 className="mb-5 max-w-md text-balance text-3xl font-bold leading-snug text-foreground md:text-4xl lg:text-[2.75rem]">
                Find the best soft play centres near you
              </h1>
              <p className="mb-8 max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">
                Trusted reviews from real parents. Search by postcode, filter by
                what matters, and discover somewhere lovely.
              </p>
              <PostcodeSearch size="lg" />
              <p className="mt-4 text-xs text-muted-foreground/70">
                Enter any UK postcode to find soft play centres nearby
              </p>
            </div>

            {/* Right: warm image with organic mask */}
            <div className="relative flex-1">
              <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-[2rem] shadow-lg" style={{ borderRadius: '42% 58% 62% 38% / 45% 55% 45% 55%' }}>
                <Image
                  src="/images/hero-softplay.jpg"
                  alt="Children playing happily in a bright, colourful soft play centre"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 90vw, 440px"
                />
              </div>
              {/* Small decorative dot */}
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

        {/* SEO content section */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute -right-40 top-0 h-72 w-72 rounded-full bg-[hsl(var(--wash-lavender))] opacity-30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl px-5 text-center">
            <h2 className="mb-5 text-2xl font-bold text-foreground">
              The UK&apos;s trusted soft play directory
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Softplay UK helps thousands of UK parents find the perfect
              indoor play centre for their children. Whether you are looking for
              a toddler-friendly space, a large adventure play world, or a calm
              sensory-friendly venue, we have you covered.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every venue is reviewed by real parents who care about the same
              things you do: cleanliness, safety, age-appropriate equipment, and
              good coffee. Search by postcode, filter by what matters, and
              discover your family&apos;s next favourite day out.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
