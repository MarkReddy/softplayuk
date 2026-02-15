'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { VenueImage } from '@/lib/types'
import { getSourceLabel } from '@/lib/data'

export function VenueGallery({
  images,
  name,
}: {
  images: VenueImage[]
  name: string
}) {
  const [current, setCurrent] = useState(0)

  // Guard against empty images array
  if (!images || images.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative flex aspect-[16/9] items-center justify-center bg-secondary md:aspect-[2/1]">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">{name}</p>
            <p className="text-sm text-muted-foreground/60">No photos yet</p>
          </div>
        </div>
      </div>
    )
  }

  const img = images[current]

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/9] md:aspect-[2/1]">
        <Image
          src={img.url}
          alt={`${name} - Photo ${current + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 800px"
        />
        {/* Source attribution overlay */}
        <span className="absolute bottom-3 right-3 rounded-full bg-foreground/50 px-2.5 py-1 text-[10px] text-primary-foreground backdrop-blur-sm">
          Photo: {img.attribution || getSourceLabel(img.source)}
        </span>
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))
            }
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md transition-colors hover:bg-card"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() =>
              setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1))
            }
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md transition-colors hover:bg-card"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full transition-colors ${i === current ? 'bg-card' : 'bg-card/50'}`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
