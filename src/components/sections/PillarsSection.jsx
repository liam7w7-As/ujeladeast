import { BookOpen, Landmark, Users } from 'lucide-react'
import { motion } from 'motion/react'
import GlassCard from '../ui/GlassCard'

const pillars = [
  {
    title: 'Espiritual',
    description:
      'Fomentando un crecimiento profundo a través del estudio bíblico, devocionales y recursos teológicos curados para la juventud.',
    icon: BookOpen,
  },
  {
    title: 'Social',
    description:
      'Construyendo una comunidad fuerte, conectando jóvenes de diferentes sociedades locales para fortalecer la hermandad en El Alto.',
    icon: Users,
  },
  {
    title: 'Administrativo',
    description:
      'Herramientas modernas para la gestión de directivas, planificación de eventos y desarrollo de liderazgo juvenil efectivo.',
    icon: Landmark,
  },
]

function PillarsSection() {
  return (
    <section className="relative z-10 mb-section-gap">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="mb-20 text-center"
      >
        <h2 className="mb-4 font-sora text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-white md:text-[56px] md:leading-[64px]">
          Nuestros Pilares
        </h2>
        <p className="mx-auto max-w-2xl font-inter text-[17px] font-light leading-7 text-white/50">
          Fundamentos diseñados para el desarrollo integral del joven cristiano en el Distrito El Alto.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon

          return (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <GlassCard>
                <div className="flex size-12 items-center justify-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#8f1937]/20 border border-[#8f1937]/30 flex items-center justify-center text-[#d85d7c]">
                    <Icon
                      aria-hidden="true"
                      className="size-6 stroke-[1.75]"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-sora text-xl font-bold tracking-wide text-white">
                    {pillar.title}
                  </h3>
                  <p className="font-inter text-sm font-normal leading-relaxed text-white/60">
                    {pillar.description}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default PillarsSection

