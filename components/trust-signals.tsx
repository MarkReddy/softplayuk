import { ShieldCheck, Sparkles, Users, Heart, MapPin } from 'lucide-react'

const signals = [
  {
    icon: Users,
    value: '40,000+',
    label: 'Parents trust us',
    color: 'text-brand-indigo',
  },
  {
    icon: MapPin,
    value: '2,000+',
    label: 'Venues listed',
    color: 'text-brand-green',
  },
  {
    icon: Sparkles,
    value: '4.7',
    label: 'Average rating',
    color: 'text-brand-coral',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'Verified reviews',
    color: 'text-brand-teal',
  },
  {
    icon: Heart,
    value: '#1',
    label: 'UK soft play site',
    color: 'text-brand-lavender',
  },
]

export function TrustSignals() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-4xl px-5">
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          {'The UK\u2019s most comprehensive soft play and children\u2019s activity site'}
        </p>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {signals.map((signal, i) => (
            <div key={i} className="text-center">
              <signal.icon className={`mx-auto mb-2.5 h-5 w-5 ${signal.color}`} />
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
