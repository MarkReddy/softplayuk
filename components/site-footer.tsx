'use client'

import Link from 'next/link'
import useSWR from 'swr'

interface CityResult { city: string; slug: string }
interface RegionResult { region: string; slug: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SiteFooter() {
  const { data: citiesData } = useSWR<{ cities: CityResult[] }>(
    '/api/cities?limit=8',
    fetcher,
    { revalidateOnFocus: false },
  )
  const { data: regionsData } = useSWR<{ regions: RegionResult[] }>(
    '/api/regions',
    fetcher,
    { revalidateOnFocus: false },
  )

  const cities = citiesData?.cities ?? []
  const regions = (regionsData?.regions ?? []).slice(0, 8)

  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
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

          {/* Popular Regions */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Popular Regions
            </h3>
            <ul className="flex flex-col gap-2.5">
              {regions.length === 0 ? (
                <li className="text-sm text-muted-foreground">Loading...</li>
              ) : (
                regions.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/regions/${r.slug}`}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {r.region}
                    </Link>
                  </li>
                ))
              )}
              <li>
                <Link href="/regions" className="text-sm font-medium text-primary hover:underline">
                  All regions
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Cities */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Popular Cities
            </h3>
            <ul className="flex flex-col gap-2.5">
              {cities.length === 0 ? (
                <li className="text-sm text-muted-foreground">Loading...</li>
              ) : (
                cities.map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/soft-play/${city.slug}`}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Soft Play in {city.city}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Info + Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Information
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link href="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Search Venues
                </Link>
              </li>
              <li>
                <Link href="/regions" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Browse by Region
                </Link>
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
