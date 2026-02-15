'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-foreground">
            Softplay
          </span>
          <span className="text-xl font-extrabold tracking-tight text-primary">
            UK
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/search" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Search
          </Link>
          <Link href="/regions" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Browse by Region
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-border/50 bg-background px-5 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/search" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Search
            </Link>
            <Link href="/regions" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Browse by Region
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
