import Button from '../ui/Button'
import ParticleCanvas from './ParticleCanvas'

function HeroSection() {
  return (
    <section className="relative z-10 mb-[200px] flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <ParticleCanvas />

      <h1 className="animate-float-delayed max-w-5xl font-sora text-[56px] font-bold leading-[64px] tracking-[-0.03em] text-white md:text-[96px] md:leading-[100px] md:tracking-[-0.04em]">
        Unidos en Cristo,
        <br />
        <span className="text-primary-container">creciendo juntos</span>
      </h1>

      <p className="animate-float-slow max-w-2xl font-inter text-[18px] font-light leading-7 text-white/60">
        La plataforma digital de la juventud INELA en El Alto. Un espacio
        disenado para la devocion, conexion y liderazgo espiritual en la era
        digital.
      </p>

      <div className="animate-float mt-6 flex flex-col gap-4 sm:flex-row">
        <Button showArrow>Explorar</Button>
        <Button variant="glass">Conocer mas</Button>
      </div>
    </section>
  )
}

export default HeroSection
