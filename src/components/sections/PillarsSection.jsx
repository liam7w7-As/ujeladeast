import { BookOpen, Landmark, Users } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

const pillars = [
  {
    title: 'Espiritual',
    description:
      'Fomentando un crecimiento profundo a traves del estudio biblico, devocionales y recursos teologicos curados para la juventud.',
    icon: BookOpen,
  },
  {
    title: 'Social',
    description:
      'Construyendo una comunidad fuerte, conectando jovenes de diferentes sociedades locales para fortalecer la hermandad en El Alto.',
    icon: Users,
  },
  {
    title: 'Administrativo',
    description:
      'Herramientas modernas para la gestion de directivas, planificacion de eventos y desarrollo de liderazgo juvenil efectivo.',
    icon: Landmark,
  },
]

function PillarsSection() {
  return (
    <section className="relative z-10 mb-section-gap">
      <div className="mb-24 text-center">
        <h2 className="mb-6 font-sora text-[40px] font-semibold leading-[48px] tracking-[-0.02em] text-white md:text-[64px] md:leading-[72px]">
          Nuestros Pilares
        </h2>
        <p className="mx-auto max-w-2xl font-inter text-[18px] font-light leading-7 text-white/50">
          Fundamentos disenados para el desarrollo integral del joven cristiano.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon

          return (
            <GlassCard key={pillar.title}>
              <div className="flex size-12 items-center justify-start">
                <Icon
                  aria-hidden="true"
                  className="size-8 stroke-[1.5] text-primary-container"
                />
              </div>
              <div>
                <h3 className="mb-4 font-sora text-xl font-semibold tracking-wide text-white">
                  {pillar.title}
                </h3>
                <p className="font-inter text-sm font-light leading-relaxed text-white/60">
                  {pillar.description}
                </p>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}

export default PillarsSection
