import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, FilePenLine, Music, BookOpen, ChartNoAxesCombined, Users, FolderOpen, UserRound, Megaphone, ChartColumn, LogOut } from 'lucide-react';

const icons = { dashboard: LayoutDashboard, edit_document: FilePenLine, music_note: Music, menu_book: BookOpen,
  monitoring: ChartNoAxesCombined, diversity_3: Users, folder_open: FolderOpen, group: UserRound,
  campaign: Megaphone, analytics: ChartColumn };

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  const location = useLocation();
  const { logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
    { id: 'posts', path: '/admin/posts', label: 'Posts', icon: 'edit_document' },
    { id: 'himnario', path: '/admin/himnario', label: 'Himnario', icon: 'music_note' },
    { id: 'estudios', path: '/admin/estudios', label: 'Estudios', icon: 'menu_book' },
    { id: 'seguimiento', path: '/admin/seguimiento', label: 'Seguimiento', icon: 'monitoring' },
    { id: 'sociedades', path: '/admin/sociedades', label: 'Sociedades', icon: 'diversity_3' },
    { id: 'recursos', path: '/admin/recursos', label: 'Recursos', icon: 'folder_open' },
    { id: 'usuarios', path: '/admin/usuarios', label: 'Usuarios', icon: 'group' },
    { id: 'notificaciones', path: '/admin/notificaciones', label: 'Notificaciones', icon: 'campaign' },
    { id: 'trimestral', path: '/admin/trimestral', label: 'Trimestral', icon: 'analytics' },
  ];

  return (
    <aside aria-label="Administración" className={`bg-glass-bg backdrop-blur-lg h-[calc(100dvh-5rem)] w-64 shrink-0 border-r border-surface-border shadow-none ${mobileOpen ? 'flex fixed left-0' : 'hidden'} lg:flex flex-col p-4 space-y-4 lg:sticky top-20 overflow-y-auto z-40`}>
      <div className="mb-8 mt-4 px-2">
        <h2 className="font-headline-md text-headline-md font-bold text-primary">Admin Panel</h2>
        <p className="text-on-surface-variant text-sm mt-1">Gestión del Distrito</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map(item => {
          const Icon = icons[item.icon];
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path);

          return (
            <Link 
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              className={`w-full text-left rounded-lg flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive 
                  ? 'bg-primary-container text-white font-bold scale-[0.98]' 
                  : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
              }`}>
              <Icon size={20} className="shrink-0" aria-hidden="true" />
              <span className="font-body-md text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-surface-border">
        <button 
          onClick={logout}
          className="w-full text-left text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-3 px-4 py-3 transition-colors">
          <LogOut size={20} aria-hidden="true" />
          <span className="font-body-md text-body-md">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
