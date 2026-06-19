import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    hymns: 0,
    studies: 0,
    societies: 0,
    resources: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch counts from Supabase
        const [
          { count: usersCount },
          { count: postsCount },
          { count: studiesCount },
          { count: societiesCount },
          { count: resourcesCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('bible_studies').select('*', { count: 'exact', head: true }),
          supabase.from('societies').select('*', { count: 'exact', head: true }),
          supabase.from('resources').select('*', { count: 'exact', head: true })
        ]);

        // Fetch Hymns count from JSONs
        let hymnsCount = 0;
        try {
          const [calaRes, inelaRes, corosRes] = await Promise.all([
            fetch('/data/himnario_cala.json'),
            fetch('/data/himnario_inela.json'),
            fetch('/data/coros.json')
          ]);
          const cala = await calaRes.json();
          const inela = await inelaRes.json();
          const coros = await corosRes.json();
          hymnsCount = (Array.isArray(cala) ? cala.length : cala.himnos?.length || 0) + 
                       (Array.isArray(inela) ? inela.length : inela.himnos?.length || 0) + 
                       (Array.isArray(coros) ? coros.length : coros.coros?.length || 0);
        } catch (e) {
          console.error("Error loading hymns count", e);
        }

        setStats({
          users: usersCount || 0,
          posts: postsCount || 0,
          hymns: hymnsCount,
          studies: studiesCount || 0,
          societies: societiesCount || 0,
          resources: resourcesCount || 0
        });

        // Fetch Recent Activity (Latest 3 Posts and Latest 3 Users)
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('id, content, created_at, user_id, profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(3);

        const { data: recentUsers } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        const combined = [
          ...(recentPosts || []).map(p => ({
            id: p.id,
            type: 'post',
            title: p.content ? p.content.substring(0, 30) + '...' : 'Publicación sin texto',
            author: p.profiles?.full_name || 'Anónimo',
            date: new Date(p.created_at),
            status: 'Publicado'
          })),
          ...(recentUsers || []).map(u => ({
            id: u.id,
            type: 'user',
            title: 'Nuevo Registro',
            author: u.full_name || 'Sin nombre',
            date: new Date(u.created_at),
            status: 'Completado'
          }))
        ].sort((a, b) => b.date - a.date).slice(0, 5);

        setRecentActivity(combined);

      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} horas`;
    return `Hace ${Math.floor(diff/86400)} días`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <header className="mb-10">
        <h1 className="font-headline-xl text-headline-xl font-bold text-on-surface mb-2">Resumen General</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Métricas clave y actividad reciente de la plataforma.</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">group</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Usuarios Registrados</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.users}</h3>
            <Link to="/admin/usuarios" className="text-xs text-secondary hover:underline">Ver todos →</Link>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">edit_document</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Total Posts</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.posts}</h3>
            <Link to="/admin/posts" className="text-xs text-secondary hover:underline">Gestionar posts →</Link>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">music_note</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Himnos & Coros</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.hymns}</h3>
            <Link to="/admin/himnario" className="text-xs text-secondary hover:underline">Ver himnario →</Link>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">menu_book</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Estudios Bíblicos</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.studies}</h3>
            <Link to="/admin/estudios" className="text-xs text-secondary hover:underline">Gestionar estudios →</Link>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">church</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Sociedades</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.societies}</h3>
            <Link to="/admin/sociedades" className="text-xs text-secondary hover:underline">Gestionar sociedades →</Link>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">folder_open</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Recursos Subidos</p>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.resources}</h3>
            <Link to="/admin/recursos" className="text-xs text-secondary hover:underline">Gestionar recursos →</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Actividad Reciente</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-surface-border/50 text-on-surface-variant text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Tipo</th>
                  <th className="p-4 font-medium">Título/Acción</th>
                  <th className="p-4 font-medium">Autor / Usuario</th>
                  <th className="p-4 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentActivity.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-on-surface-variant">Sin actividad reciente</td></tr>
                ) : recentActivity.map((act) => (
                  <tr key={act.id} className="border-b border-surface-border/30 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">
                          {act.type === 'post' ? 'edit_document' : 'group'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-white font-medium">{act.title}</td>
                    <td className="p-4 text-on-surface-variant">{act.author}</td>
                    <td className="p-4 text-on-surface-variant text-sm">{timeAgo(act.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & System Status */}
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/admin/notificaciones" className="bg-surface-container hover:bg-primary-container/20 border border-surface-border hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary">campaign</span>
                </div>
                <span className="text-xs text-center text-white font-medium">Notificar</span>
              </Link>
              <Link to="/admin/estudios" className="bg-surface-container hover:bg-primary-container/20 border border-surface-border hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary">add_box</span>
                </div>
                <span className="text-xs text-center text-white font-medium">Estudio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
