import { Mail, Share2 } from 'lucide-react'

const footerGroups = [
  {
    title: 'Plataforma',
    links: ['Inicio', 'Feed', 'Recursos'],
  },
  {
    title: 'Comunidad',
    links: ['Sociedades', 'Estudios', 'Eventos'],
  },
  {
    title: 'Legal',
    links: ['Privacidad', 'Terminos', 'Contacto'],
  },
]

function Footer() {
  return (
    <footer className="relative z-10 mx-auto mt-section-gap flex w-full max-w-[1280px] flex-col border-t border-surface-border bg-transparent px-gutter py-24 md:px-12">
      <div className="flex w-full flex-col items-start justify-between gap-16 md:flex-row">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white opacity-80 shadow-[0_0_16px_rgba(143,25,55,0.25)] transition-all duration-500 hover:opacity-100">
              U
            </span>
            <span className="font-inter text-xl font-bold tracking-tight text-white">
              UJELADEA
            </span>
          </div>
          <p className="max-w-xs font-inter text-sm font-light leading-relaxed text-white/50">
            Unidos en Cristo, creciendo juntos. Parte de UJELAB y la Iglesia
            Nacional INELA Bolivia.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-16 md:grid-cols-3">
          {footerGroups.map((group) => (
            <div className="flex flex-col gap-5" key={group.title}>
              <h4 className="mb-2 font-inter text-xs font-semibold uppercase tracking-widest text-white/40">
                {group.title}
              </h4>
              {group.links.map((link) => (
                <a
                  className="font-inter text-sm text-white/70 transition-colors duration-200 hover:text-white"
                  href="#"
                  key={link}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-24 flex w-full flex-col items-center justify-between gap-4 border-t border-surface-border pt-8 md:flex-row">
        <p className="font-inter text-xs font-light text-white/40">
          (c) 2024 UJELADEA. Caminando en la luz.
        </p>
        <div className="flex gap-6">
          <Share2 className="size-5 cursor-pointer text-white/40 transition-colors hover:text-white" />
          <Mail className="size-5 cursor-pointer text-white/40 transition-colors hover:text-white" />
        </div>
      </div>
    </footer>
  )
}

export default Footer
