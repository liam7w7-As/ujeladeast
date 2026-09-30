import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ImagePlus, Library, Music2, PenLine, RefreshCw, Users } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import PostCard from '../components/ui/PostCard';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import CreatePostModal from '../components/ui/CreatePostModal';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';
import { FEED_FILTERS } from '../lib/feed';
import './feed.css';

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { posts, loading, error, getPosts, createPost, likePost, unlikePost } = usePosts();

  useEffect(() => {
    const timer = setTimeout(() => getPosts(activeFilter), 0);
    return () => clearTimeout(timer);
  }, [activeFilter, getPosts]);

  const openComposer = () => user ? setIsModalOpen(true) : navigate('/login');
  const publish = async (content, image, category) => {
    setIsSubmitting(true);
    try {
      await createPost(content, image, category);
      setIsModalOpen(false);
      if (activeFilter !== 'Todos') setActiveFilter('Todos');
      else await getPosts('Todos');
    } finally { setIsSubmitting(false); }
  };

  return <PageShell activeItem="feed" withFooter={false} ambient={false} className="community-feed">
    <main className="feed-layout">
      <header className="feed-heading"><div><h1>Comunidad</h1><p>La fe también se comparte.</p></div><button type="button" onClick={openComposer} className="feed-primary" aria-label="Crear publicación" title="Crear publicación"><PenLine size={18} /><span>Nueva publicación</span></button></header>
      <div className="feed-columns">
        <div className="feed-stream">
          <button type="button" onClick={openComposer} className="feed-compose" aria-label="Comparte con la comunidad">
            <ProfileAvatar profile={profile} metadata={user?.user_metadata} />
            <span className="feed-compose-copy">{user ? '¿Qué te gustaría compartir?' : 'Tu voz también es parte de la comunidad'}<small>{user ? 'Una reflexión, una foto, un motivo de gratitud.' : 'Inicia sesión para sumarte.'}</small></span>
            <ImagePlus size={20} className="shrink-0 text-[#a3b8af]" />
          </button>
          <nav aria-label="Filtrar publicaciones" className="feed-tabs">{FEED_FILTERS.map(filter => <button type="button" key={filter.id} aria-pressed={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>{filter.label}</button>)}</nav>
          <div className="mb-3 flex items-center justify-between px-1 text-xs text-[#a5aaa8]"><span>Más recientes</span><button type="button" onClick={() => getPosts(activeFilter)} disabled={loading} title="Actualizar publicaciones" aria-label="Actualizar publicaciones" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 disabled:opacity-40"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
          {error ? <div role="alert" className="feed-feedback">No se pudieron cargar las publicaciones. <button onClick={() => getPosts(activeFilter)} className="underline underline-offset-4" type="button">Reintentar</button></div>
            : loading ? <div className="feed-posts" role="status" aria-label="Cargando publicaciones">{[1, 2].map(item => <div key={item} className="feed-post p-5 animate-pulse"><div className="flex items-center gap-3 mb-6"><div className="h-11 w-11 rounded-full bg-white/10" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-white/10" /><div className="h-2 w-24 rounded bg-white/5" /></div></div><div className="h-3 w-full bg-white/5 mb-3 rounded" /><div className="h-3 w-4/5 bg-white/5 mb-6 rounded" /><div className="h-52 rounded bg-white/5" /></div>)}</div>
              : posts.length ? <div className="feed-posts">{posts.map(post => <PostCard key={post.id} {...post} onToggleLike={(id, liked) => liked ? likePost(id) : unlikePost(id)} />)}</div>
                : <div className="feed-empty"><Users size={28} className="mx-auto mb-4 text-[#a7cbbc]" /><p className="font-medium text-[#e0e5e1]">Todavía no hay publicaciones {activeFilter === 'Todos' ? '' : 'en esta categoría'}.</p><button type="button" onClick={openComposer} className="mt-4 text-[#ffc0c8] underline underline-offset-4">Comparte la primera</button></div>}
        </div>
        <aside className="feed-sidebar" aria-label="Nuestra comunidad">
          <section className="feed-sidebar-section"><div className="flex items-center gap-3 mb-4">{user ? <ProfileAvatar profile={profile} metadata={user.user_metadata} className="h-12 w-12" /> : <img src="/logo-ujeladea.png" alt="UJELADEA" className="h-12 w-12 object-contain" />}<div className="min-w-0"><p className="text-sm font-semibold break-words">{profile?.full_name || 'UJELADEA'}</p><p className="text-xs text-[#a5aaa8] mt-1 break-words">{profile?.church_name || 'Jóvenes unidos en la fe'}</p></div></div>{!user && <Link to="/register" className="text-xs text-[#ffc0c8] inline-flex items-center gap-1">Ser parte de la comunidad<ArrowUpRight size={14} /></Link>}</section>
          <section className="feed-sidebar-section"><h2>Sigamos creciendo</h2>
            <Link to="/estudios" className="feed-sidebar-link"><BookOpen size={20} className="text-[#a7cbbc]" /><span>Estudios bíblicos<small>Un momento para la Palabra</small></span><ArrowUpRight size={15} /></Link>
            <Link to="/himnario" className="feed-sidebar-link"><Music2 size={20} className="text-[#e8cb8d]" /><span>Himnario<small>Cantos que nos unen</small></span><ArrowUpRight size={15} /></Link>
            <Link to="/recursos" className="feed-sidebar-link"><Library size={20} className="text-[#c2bded]" /><span>Recursos<small>Para nuestra comunidad</small></span><ArrowUpRight size={15} /></Link>
          </section>
          <div className="feed-sidebar-foot"><Users size={15} /><Link to="/sociedades" className="hover:text-white">Nuestras sociedades</Link></div>
        </aside>
      </div>
    </main>
    <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={publish} isSubmitting={isSubmitting} />
  </PageShell>;
}
