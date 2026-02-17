import { Search, SlidersHorizontal, Heart } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: 'Search by postcode',
    description:
      'Pop in your postcode and discover soft play centres nearby, instantly.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Filter what matters',
    description:
      'Narrow down by age, price, cleanliness, and the things parents actually care about.',
  },
  {
    icon: Heart,
    title: 'Find your favourite',
    description:
      'Read real parent reviews, check opening times, and plan a lovely day out.',
  },
]

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-20">
      {/* Subtle pastel wash background */}
      <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-[hsl(var(--brand-coral))] opacity-15 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[hsl(var(--brand-teal))] opacity-15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-5">
        <h2 className="mb-3 text-center text-2xl font-bold text-foreground">
          How it works
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Finding great soft play has never been simpler
        </p>
        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
