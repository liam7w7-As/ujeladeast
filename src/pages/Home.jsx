import PageShell from '../components/layout/PageShell'
import HeroSection from '../components/sections/HeroSection'
import PillarsSection from '../components/sections/PillarsSection'
import DomainMigrationNotice from '../components/ui/DomainMigrationNotice'
import { InstitutionContent, PublicLinks } from '../components/seo/PublicContent'
import './institution.css'

function Home() {
  return (
    <PageShell activeItem="home">
      <main className="mx-auto w-full max-w-[1280px] px-gutter pb-section-gap pt-[200px] md:px-12">
        <DomainMigrationNotice />
        <HeroSection />
        <PillarsSection />
        <div className="home-institution"><InstitutionContent heading="h2" compact /><PublicLinks /></div>
      </main>
    </PageShell>
  )
}

export default Home
