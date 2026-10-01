import { motion, useReducedMotion } from 'motion/react'
import AmbientBackground from '../sections/AmbientBackground'
import Footer from './Footer'
import Navbar from './Navbar'
import MobileNavigation from './MobileNavigation'
import { pageTransition } from '../../lib/animations'

function PageShell({ activeItem = 'home', children, withFooter = true, ambient = true, className = '' }) {
  const reduced = useReducedMotion()
  return (
    <div className={`public-page relative min-h-screen overflow-x-hidden bg-background text-on-background ${className}`}>
      {ambient && <AmbientBackground />}
      <Navbar activeItem={activeItem} />
      <MobileNavigation />
      <motion.div
        variants={pageTransition}
        initial={reduced ? false : 'initial'}
        animate="animate"
        exit="exit"
        className="public-page-content w-full"
      >
        {children}
      </motion.div>
      {withFooter && <Footer />}
    </div>
  )
}

export default PageShell

