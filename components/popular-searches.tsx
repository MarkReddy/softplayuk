import Link from 'next/link'
import { MapPin } from 'lucide-react'

const searches = [
  { label: 'Manchester', href: '/soft-play/manchester' },
  { label: 'London', href: '/soft-play/london' },
  { label: 'Birmingham', href: '/soft-play/birmingham' },
  { label: 'Leeds', href: '/soft-play/leeds' },
  { label: 'Bristol', href: '/soft-play/bristol' },
  { label: 'Edinburgh', href: '/soft-play/edinburgh' },
]

export function PopularSearches() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="mb-2 text-center text-xl font-bold text-foreground">
          Browse by city
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Explore soft play centres across the UK
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {searches.map((search) => (
            <Link
              key={search.href}
              href={search.href}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <MapPin className="h-3.5 w-3.5 text-primary/60" />
              {search.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
