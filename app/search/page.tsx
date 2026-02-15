import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { SearchResultsClient } from '@/components/search-results-client'

export const metadata: Metadata = {
  title: 'Search Soft Play Centres',
  description:
    'Search for soft play centres near you by postcode. Filter by age, price, facilities, and real parent reviews.',
}

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading search...</p>
            </div>
          }
        >
          <SearchResultsClient />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
