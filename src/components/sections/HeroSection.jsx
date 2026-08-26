import { motion } from 'motion/react'
import Button from '../ui/Button'
import ParticleCanvas from './ParticleCanvas'
import { fadeInUp } from '../../lib/animations'

function HeroSection() {
  return (
    <section className="relative z-10 mb-[160px] flex min-h-[75vh] flex-col items-center justify-center gap-8 text-center px-4">
      <ParticleCanvas />

      {/* Badge / Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8f1937]/40 bg-[#8f1937]/10 backdrop-blur-md shadow-[0_0_20px_rgba(143,25,55,0.2)]"
      >
        <span className="w-2 h-2 rounded-full bg-[#8f1937] animate-ping" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d85d7c]">
          Distrito El Alto • INELA
        </span>
      </motion.div>

      {/* Main Title */}
      <motion.h1 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-5xl font-sora text-[56px] font-extrabold leading-[64px] tracking-[-0.03em] text-white md:text-[96px] md:leading-[100px] md:tracking-[-0.04em] drop-shadow-2xl"
      >
        UJELADEA
      </motion.h1>

      {/* Subtitle */}
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        className="max-w-2xl font-inter text-[20px] md:text-[24px] font-semibold leading-8 text-[#d85d7c]"
      >
        "Somos Uno en Cristo, unidos permaneceremos"
      </motion.p>

      {/* Scripture Quote */}
      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="max-w-3xl font-inter text-[15px] md:text-[17px] font-light leading-relaxed text-white/70 italic bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
      >
        "Y ya no estoy en el mundo; mas estos están en el mundo, y yo voy a ti. Padre santo, a los que me has dado, guárdalos en tu nombre, para que sean uno, así como nosotros."
        <span className="not-italic text-white/40 text-sm mt-3 block font-medium">— San Juan 17:11</span>
      </motion.p>

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-4 flex flex-col gap-4 sm:flex-row items-center"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button showArrow>Explorar Feed</Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="glass">Conocer más</Button>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default HeroSection

