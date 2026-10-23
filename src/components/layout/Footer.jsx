import { Link } from 'react-router-dom'
import { organization } from '../../lib/siteContent'
import SocialLinks from '../ui/SocialLinks'
import '../ui/social-links.css'

const footerGroups = [
  {
    title: 'Plataforma',
    links: [['Inicio', '/'], ['Quiénes somos', '/nosotros'], ['Comunidad', '/feed'], ['Recursos', '/recursos'], ['Privacidad', '/privacidad']],
  },
  {
    title: 'Crecer juntos',
    links: [['Estudio bíblico', '/estudio-biblico'], ['Biblia', '/biblia'], ['Himnario', '/himnario'], ['Sociedades', '/sociedades']],
  },
]

function Footer() {
  return (
    <footer className="relative z-10 mx-auto mt-16 hidden w-full max-w-[1200px] flex-col border-t border-surface-border px-8 py-12 xl:flex">
      <div className="flex w-full items-start justify-between gap-16">
        <div className="flex flex-col gap-5">
          <Link to="/" aria-label="UJELADEA inicio" className="flex items-center gap-3 self-start">
            <img src="/logo-ujeladea.png" alt="" className="h-11 w-11 object-contain" />
            <span className="text-xl font-bold text-white">
              UJELADEA
            </span>
          </Link>
          <p className="max-w-xs font-inter text-sm font-light leading-relaxed text-white/50">
            {organization.fullName}
          </p>
          <SocialLinks />
        </div>

        <div className="grid grid-cols-2 gap-20">
          {footerGroups.map((group) => (
            <div className="flex flex-col gap-5" key={group.title}>
              <h4 className="text-xs font-semibold text-white/50">
                {group.title}
              </h4>
              {group.links.map(([label, to]) => (
                <Link
                  className="font-inter text-sm text-white/70 transition-colors duration-200 hover:text-white"
                  to={to}
                  key={to}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex w-full items-center justify-between gap-4 border-t border-surface-border pt-6">
        <p className="font-inter text-xs font-light text-white/40">
          © {new Date().getFullYear()} UJELADEA
        </p>
        <span className="text-sm text-white/70">Somos uno en Cristo</span>
      </div>
    </footer>
  )
}

export default Footer
