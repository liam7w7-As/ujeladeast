import AmbientBackground from '../sections/AmbientBackground'
import Footer from './Footer'
import Navbar from './Navbar'

function PageShell({ activeItem = 'home', children, withFooter = true }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-on-background">
      <AmbientBackground />
      <Navbar activeItem={activeItem} />
      {children}
      {withFooter && <Footer />}
    </div>
  )
}

export default PageShell
