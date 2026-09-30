import Sidebar from '../components/layout/Sidebar';
import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import AdminSearch from '../components/admin/AdminSearch';
import NotificationBell from '../components/ui/NotificationBell';

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
          <div className="flex items-center gap-1 sm:gap-3">
            <AdminSearch />
            <NotificationBell admin />
          <button onClick={() => setMobileOpen(open => !open)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} className="lg:hidden text-on-surface-variant p-2">
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
          </div>
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
