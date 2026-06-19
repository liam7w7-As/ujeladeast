import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user: currentUser } = useAuth();
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      // Solo lee la tabla profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      alert("No puedes quitarte el rol de admin a ti mismo.");
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMessage = targetUser.role === 'admin' 
      ? `¿Quitar rol de admin a ${targetUser.full_name}?`
      : `¿Hacer admin a ${targetUser.full_name}? Tendrá control total del sistema.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert("Error al cambiar rol: " + err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.church_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Gestión de Usuarios</h1>
        <p className="text-on-surface-variant text-sm">Administra los accesos y roles de los jóvenes registrados.</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface-container/30 p-4 rounded-2xl border border-surface-border">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o iglesia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-container border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-all sm:w-48 cursor-pointer"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="user">Usuarios base</option>
        </select>
        <button 
          onClick={loadUsers}
          className="px-4 py-2.5 bg-surface-container border border-surface-border rounded-xl text-on-surface-variant hover:text-white transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Error: {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50 border-b border-surface-border text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Usuario</th>
                <th className="p-4 font-semibold">Iglesia / Sociedad</th>
                <th className="p-4 font-semibold">Rol</th>
                <th className="p-4 font-semibold">Registro</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-border/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-on-surface-variant">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-on-surface-variant">No se encontraron usuarios.</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            u.full_name?.charAt(0)?.toUpperCase() || '?'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.full_name || 'Sin nombre'}</p>
                          <p className="text-xs text-on-surface-variant truncate max-w-[150px]">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      {u.church_name || <span className="italic opacity-50">No especificada</span>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'admin' 
                          ? 'bg-secondary/10 text-secondary border border-secondary/20' 
                          : 'bg-surface-container-high text-on-surface-variant border border-surface-border'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {u.role === 'admin' ? 'admin_panel_settings' : 'person'}
                        </span>
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={u.id === currentUser?.id}
                        className="p-2 rounded-lg bg-surface-container border border-surface-border text-on-surface-variant hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.role === 'admin' ? 'Quitar rol admin' : 'Hacer admin'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {u.role === 'admin' ? 'person_off' : 'verified_user'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
