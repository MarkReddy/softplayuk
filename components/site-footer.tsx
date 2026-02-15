'use client'

import Link from 'next/link'

const cities = [
  { name: 'Manchester', slug: 'manchester' },
  { name: 'London', slug: 'london' },
  { name: 'Birmingham', slug: 'birmingham' },
  { name: 'Leeds', slug: 'leeds' },
  { name: 'Bristol', slug: 'bristol' },
  { name: 'Edinburgh', slug: 'edinburgh' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="mb-4 flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Softplay
              </span>
              <span className="text-lg font-extrabold tracking-tight text-primary">
                UK
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Helping UK parents find the best soft play centres for their
              children. Trusted reviews, real insights, always free.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Popular Cities
            </h3>
            <ul className="flex flex-col gap-2.5">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/soft-play/${city.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Soft Play in {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Information
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link href="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Explore All Venues
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Add Your Venue
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  About Us
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Contact
                </span>
              </li>
            </ul>

            <h3 className="mb-4 mt-6 text-sm font-semibold text-foreground">
              Legal
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-cookie-settings'))
                  }}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-6">
          <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
            <p>Softplay UK. Made with care for UK parents.</p>
            <p>
              <Link href="/privacy-policy" className="underline hover:text-foreground">
                Privacy
              </Link>
              {' | '}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>
              {' | '}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-cookie-settings'))
                }}
                className="underline hover:text-foreground"
              >
                Cookies
              </button>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
