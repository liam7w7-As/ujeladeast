import Sidebar from '../components/layout/Sidebar';
import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Bell, Menu, Search, X } from 'lucide-react';

export default function Admin() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col relative">
      
      {/* TopNavBar (Adapted for Admin) */}
      <nav className="bg-glass-bg dark:bg-glass-bg fixed top-0 w-full z-50 backdrop-blur-xl border-b border-surface-border shadow-none transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-gutter h-20 max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display-lg-mobile text-display-lg-mobile font-extrabold text-primary dark:text-primary tracking-tight">UJELADEA</Link>
            <span className="font-label-sm text-label-sm bg-primary-container text-white px-2 py-1 rounded border border-outline-variant uppercase tracking-wider ml-2 hidden md:inline-block">Admin</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input className="bg-surface-container-high border border-surface-border rounded-full py-2 pl-10 pr-4 text-body-md font-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 w-64 transition-colors outline-none" placeholder="Buscar..." type="text"/>
            </div>
            <div className="flex items-center gap-4">
              <button aria-label="Notificaciones" className="text-on-surface-variant hover:text-primary transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
              </button>
            </div>
          </div>
          <button onClick={() => setMobileOpen(open => !open)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} className="lg:hidden text-on-surface-variant p-2">
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Main Layout Container */}
      <div className="flex-1 flex pt-20 max-w-container-max mx-auto w-full relative z-10">
        {mobileOpen && <button aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="fixed inset-0 top-20 bg-black/60 z-30 lg:hidden" />}
        <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

        {/* Main Content Canvas */}
        <main className="flex-1 p-6 md:p-10 w-full min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
