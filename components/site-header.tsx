'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 36 36" className="h-8 w-8" aria-hidden="true">
            <circle cx="18" cy="10" r="4" fill="hsl(244 34% 42%)" />
            <path d="M18 14c-3 0-6 3-6 7 0 2 1 4 3 5l3 4 3-4c2-1 3-3 3-5 0-4-3-7-6-7z" fill="hsl(244 34% 42%)" />
            <circle cx="8" cy="8" r="2.5" fill="hsl(155 55% 45%)" />
            <circle cx="28" cy="7" r="2" fill="hsl(350 70% 65%)" />
            <circle cx="6" cy="20" r="2" fill="hsl(175 45% 55%)" />
            <circle cx="30" cy="19" r="2.5" fill="hsl(265 45% 68%)" />
            <circle cx="10" cy="30" r="1.5" fill="hsl(30 85% 58%)" />
            <circle cx="26" cy="30" r="2" fill="hsl(155 55% 45%)" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight text-primary">
            Soft Play <span className="text-accent">UK</span>
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
          <Link href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Guides
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
            <Link href="/blog" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Guides
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
