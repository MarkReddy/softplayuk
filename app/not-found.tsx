import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="mb-6 text-muted-foreground">
            We couldn&apos;t find what you were looking for. Let&apos;s get you
            back on track.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">Search venues</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
