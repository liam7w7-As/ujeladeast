import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import NotificationBell from '../ui/NotificationBell'
import { HeartHandshake, LogOut, Menu, X } from 'lucide-react'
import ProfileAvatar from '../ui/ProfileAvatar'

const navItems = [
  { label: 'Inicio', href: '/', id: 'home' },
  { label: 'Feed', href: '/feed', id: 'feed' },
  { label: 'Himnario', href: '/himnario', id: 'hymnal' },
  { label: 'Biblia', href: '/biblia', id: 'bible' },
  { label: 'Estudios', href: '/estudios', id: 'bible-studies' },
  { label: 'Sociedades', href: '/sociedades', id: 'societies' },
  { label: 'Recursos', href: '/recursos', id: 'resources' },
]

function Navbar({ activeItem = 'home' }) {
  const { user, profile, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className={`desktop-navbar fixed left-0 right-0 top-0 z-50 mx-auto mt-3 sm:mt-5 flex w-[calc(100%-24px)] max-w-[1280px] flex-col border border-surface-border bg-glass-bg px-4 sm:px-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${isMenuOpen ? 'rounded-2xl py-4 max-h-[calc(100dvh-24px)] overflow-y-auto' : 'rounded-full py-3'}`}>
      
      {/* Top Row: Logo & Desktop Menus & Mobile Toggle */}
      <div className="flex w-full items-center justify-between gap-4">
        
        {/* Logo */}
        <Link
          aria-label="UJELADEA inicio"
          className="flex items-center gap-3 xl:border-r border-surface-border xl:pr-6 group mr-auto xl:mr-0"
          to="/"
          onClick={() => setIsMenuOpen(false)}
        >
          <motion.div 
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#09090b] p-1 border border-white/10 shadow-[0_0_16px_rgba(143,25,55,0.35)] overflow-hidden"
          >
            <img 
              src="/logo-ujeladea.png" 
              alt="Logo UJELADEA" 
              className="h-full w-full object-contain"
            />
          </motion.div>
          <span className="font-inter text-sm font-bold tracking-wide text-white group-hover:text-primary transition-colors">
            UJELADEA
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-5 px-2 xl:flex flex-grow justify-center">
          {navItems.map((item) => {
            const isActive = item.id === activeItem
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`relative font-inter text-sm font-medium tracking-wide transition-colors duration-300 py-1 ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
                to={item.href}
                key={item.label}
              >
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8f1937] to-transparent rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Desktop Auth / User */}
        <div className="hidden items-center gap-4 xl:border-l border-surface-border xl:pl-4 xl:flex">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Botón SOS / Apoyo Espiritual */}
              <Link
                to="/estudios"
                state={{ openSOS: true }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105"
                style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.08)' }}
                title="Apoyo espiritual de UJELADITO"
              >
                <HeartHandshake size={16} />
                SOS
              </Link>
              <div className="flex items-center gap-2 max-w-[120px] ml-2">
                <ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-8 w-8 shrink-0" />
                <span className="font-label-sm text-sm text-on-surface truncate">
                  {profile?.full_name || user.email.split('@')[0]}
                </span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={logout}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-surface-border flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          ) : (
            <Link to="/login">
              <Button className="px-5 py-2 text-sm whitespace-nowrap" type="button">
                Iniciar sesión
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle Button */}
        {user && <NotificationBell />}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          className="xl:hidden flex shrink-0 items-center justify-center text-on-surface w-11 h-11 rounded-full hover:bg-white/10 transition-colors"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </motion.button>

      </div>

      {/* Mobile Menu Dropdown with AnimatePresence */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col gap-4 mt-4 pt-4 border-t border-surface-border xl:hidden"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.id === activeItem
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`font-inter text-base font-medium px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-semibold' 
                        : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            
            {/* SOS Mobile */}
            {user && (
              <Link
                to="/estudios"
                state={{ openSOS: true }}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 font-inter text-base font-semibold px-4 py-3 rounded-lg transition-colors border"
                style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.08)' }}
              >
                <HeartHandshake size={20} />
                Apoyo Espiritual (SOS)
              </Link>
            )}

            <div className="pt-4 mt-2 border-t border-surface-border flex flex-col gap-4">
              {user ? (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-10 w-10 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-sm text-on-surface truncate max-w-[150px]">
                        {profile?.full_name || user.email.split('@')[0]}
                      </span>
                      <span className="text-xs text-on-surface-variant truncate max-w-[150px]">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-10 h-10 rounded-full bg-error/10 border border-error/30 flex items-center justify-center text-error hover:bg-error/20 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full">
                  <Button className="w-full py-3" type="button">
                    Iniciar sesión
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar

