import Button from '../ui/Button'
import ParticleCanvas from './ParticleCanvas'

function HeroSection() {
  return (
    <section className="relative z-10 mb-[200px] flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <ParticleCanvas />

      <h1 className="animate-float-delayed max-w-5xl font-sora text-[56px] font-bold leading-[64px] tracking-[-0.03em] text-white md:text-[96px] md:leading-[100px] md:tracking-[-0.04em]">
        UJELADEA
      </h1>

      <p className="animate-float-slow max-w-2xl font-inter text-[20px] font-medium leading-8 text-[#8f1937] mb-2">
        "Somos Uno en Cristo, unidos permaneceremos"
      </p>

      <p className="animate-float-slow max-w-3xl font-inter text-[16px] font-light leading-7 text-white/70 italic">
        "Y ya no estoy en el mundo; mas estos están en el mundo, y yo voy a ti. Padre santo, a los que me has dado, guárdalos en tu nombre, para que sean uno, así como nosotros."<br/><span className="not-italic text-white/50 text-sm mt-2 block">— San Juan 17:11</span>
      </p>

      <div className="animate-float mt-6 flex flex-col gap-4 sm:flex-row">
        <Button showArrow>Explorar</Button>
        <Button variant="glass">Conocer mas</Button>
      </div>
    </section>
  )
}

export default HeroSection
