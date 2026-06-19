import PageShell from '../components/layout/PageShell'
import HeroSection from '../components/sections/HeroSection'
import PillarsSection from '../components/sections/PillarsSection'

function Home() {
  return (
    <PageShell activeItem="home">
      <main className="mx-auto w-full max-w-[1280px] px-gutter pb-section-gap pt-[200px] md:px-12">
        <HeroSection />
        <PillarsSection />
      </main>
    </PageShell>
  )
}

export default Home
