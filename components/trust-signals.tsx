import { ShieldCheck, Sparkles, Users, Heart } from 'lucide-react'

const signals = [
  {
    icon: Users,
    value: '10,000+',
    label: 'Parents trust us',
  },
  {
    icon: Heart,
    value: '500+',
    label: 'Venues listed',
  },
  {
    icon: Sparkles,
    value: '4.7',
    label: 'Average rating',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'Verified reviews',
  },
]

export function TrustSignals() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl px-5">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {signals.map((signal, i) => (
            <div key={i} className="text-center">
              <signal.icon className="mx-auto mb-2.5 h-5 w-5 text-primary/70" />
              <div className="text-2xl font-bold text-foreground">
                {signal.value}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">{signal.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
