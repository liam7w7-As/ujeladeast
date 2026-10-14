import PageShell from '../components/layout/PageShell'
import DomainMigrationNotice from '../components/ui/DomainMigrationNotice'
import { HomeHero, HomeIntro, HomeResources, HomeConnect } from '../components/seo/HomeContent'
import CommunityGallery from '../components/sections/CommunityGallery'
import ParticleCanvas from '../components/sections/ParticleCanvas'
import './home.css'

function Home() {
  return (
    <PageShell activeItem="home" ambient={false} className="landing-page">
      <main className="landing-main">
        <div className="landing-container landing-migration"><DomainMigrationNotice /></div>
        <HomeHero />
        <section className="landing-story"><ParticleCanvas /><HomeIntro /></section>
        <HomeResources />
        <CommunityGallery />
        <HomeConnect />
      </main>
    </PageShell>
  )
}

export default Home
