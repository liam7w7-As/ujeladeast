import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import NotificationBell from '../ui/NotificationBell'

const navItems = [
  { label: 'Inicio', href: '/', id: 'home' },
  { label: 'Feed', href: '/feed', id: 'feed' },
  { label: 'Himnario', href: '/himnario', id: 'hymnal' },
  { label: 'Estudios', href: '/estudios', id: 'bible-studies' },
  { label: 'Sociedades', href: '/sociedades', id: 'societies' },
  { label: 'Recursos', href: '/recursos', id: 'resources' },
]

function Navbar({ activeItem = 'home' }) {
  const { user, profile, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className={`fixed left-0 right-0 top-0 z-50 mx-auto mt-6 flex w-[calc(100%-32px)] flex-col border border-surface-border bg-glass-bg px-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:max-w-[1280px] md:w-max ${isMenuOpen ? 'rounded-2xl py-4' : 'rounded-full py-3'}`}>
      
      {/* Top Row: Logo & Desktop Menus & Mobile Toggle */}
      <div className="flex w-full items-center justify-between gap-4">
        
        {/* Logo */}
        <Link
          aria-label="UJELADEA inicio"
          className="flex items-center gap-4 md:border-r border-surface-border md:pr-6"
          to="/"
          onClick={() => setIsMenuOpen(false)}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white shadow-[0_0_16px_rgba(143,25,55,0.35)]">
            U
          </span>
          <span className="font-inter text-sm font-bold tracking-wide text-white">
            UJELADEA
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-6 px-4 md:flex flex-grow justify-center">
          {navItems.map((item) => {
            const isActive = item.id === activeItem
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`font-inter text-sm font-medium tracking-wide transition-colors duration-300 ${
                  isActive
                    ? 'text-white hover:text-white/70'
                    : 'text-white/60 hover:text-white'
                }`}
                to={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Desktop Auth / User */}
        <div className="hidden items-center gap-4 md:border-l border-surface-border md:pl-6 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Botón SOS / Apoyo Espiritual */}
              <Link
                to="/estudios"
                state={{ openSOS: true }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.08)' }}
                title="Apoyo espiritual de UJELADITO"
              >
                <span className="material-symbols-outlined text-[15px]">volunteer_activism</span>
                SOS
              </Link>
              <NotificationBell />
              <div className="flex items-center gap-2 max-w-[120px] ml-2">
                <span className="font-label-sm text-sm text-on-surface truncate">
                  {profile?.full_name || user.email.split('@')[0]}
                </span>
              </div>
              <button 
                onClick={logout}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-surface-border flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
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
        <button 
          className="md:hidden flex items-center justify-center text-on-surface w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="material-symbols-outlined">
            {isMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-surface-border md:hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => {
              const isActive = item.id === activeItem
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-inter text-base font-medium px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-container/20 text-primary border border-primary-container/30' 
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
              <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              Apoyo Espiritual (SOS)
            </Link>
          )}

          <div className="pt-4 mt-2 border-t border-surface-border flex flex-col gap-4">
            {user ? (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high border border-surface-border flex items-center justify-center text-on-surface">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
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
                  <span className="material-symbols-outlined">logout</span>
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
        </div>
      )}
    </nav>
  )
}

export default Navbar
