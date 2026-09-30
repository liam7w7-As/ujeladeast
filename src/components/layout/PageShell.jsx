import { motion } from 'motion/react'
import AmbientBackground from '../sections/AmbientBackground'
import Footer from './Footer'
import Navbar from './Navbar'
import { pageTransition } from '../../lib/animations'

function PageShell({ activeItem = 'home', children, withFooter = true, ambient = true, className = '' }) {
  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-background text-on-background ${className}`}>
      {ambient && <AmbientBackground />}
      <Navbar activeItem={activeItem} />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
      {withFooter && <Footer />}
    </div>
  )
}

export default PageShell

