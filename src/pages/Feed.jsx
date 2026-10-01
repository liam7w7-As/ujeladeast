import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Check, ImagePlus, Music2, Plus, RefreshCw, Users, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import FeedNavigation from '../components/layout/FeedNavigation';
import PostCard from '../components/ui/PostCard';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import CreatePostModal from '../components/ui/CreatePostModal';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';
import { FEED_FILTERS } from '../lib/feed';
import './feed.css';

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [published, setPublished] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { posts, loading, error, getPosts, createPost, likePost, unlikePost } = usePosts();

  useEffect(() => {
    const timer = setTimeout(() => getPosts(activeFilter), 0);
    return () => clearTimeout(timer);
  }, [activeFilter, getPosts]);
  useEffect(() => {
    if (!published) return;
    const timer = setTimeout(() => setPublished(false), 4000);
    return () => clearTimeout(timer);
  }, [published]);

  const authors = [...new Map(posts.filter(post => post.user_id && post.profiles).map(post => [post.user_id, { id: post.user_id, ...post.profiles }])).values()];
  const visiblePosts = selectedAuthor ? posts.filter(post => post.user_id === selectedAuthor.id) : posts;
  const openComposer = () => user ? setIsModalOpen(true) : navigate('/login');
  const publish = async (content, image, category) => {
    setIsSubmitting(true);
    try {
      await createPost(content, image, category);
      setIsModalOpen(false);
      setSelectedAuthor(null);
      setPublished(true);
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
      if (activeFilter !== 'Todos') setActiveFilter('Todos');
      else await getPosts('Todos');
    } finally { setIsSubmitting(false); }
  };

  return <MotionConfig reducedMotion="user">
    <div className="community-feed">
      <FeedNavigation onCreate={openComposer} />
      <main className="feed-layout">
        <div className="feed-columns">
          <div className="feed-stream">
            <header className="feed-heading">
              <div><h1>Comunidad<span>.</span></h1><p>Lo que vivimos, lo que creemos.</p></div>
              <button type="button" onClick={() => getPosts(activeFilter)} disabled={loading} title="Actualizar publicaciones" aria-label="Actualizar publicaciones" className="feed-icon"><RefreshCw size={19} className={loading ? 'animate-spin' : ''} /></button>
            </header>
            <div className="feed-people" aria-label="Personas de la comunidad">
              <motion.button type="button" onClick={openComposer} className="feed-person" aria-label="Comparte con la comunidad" whileTap={reduced ? undefined : { scale: 0.95 }}>
                <span className="feed-person-portrait feed-person-own"><ProfileAvatar profile={profile} metadata={user?.user_metadata} className="h-[58px] w-[58px]" /><span className="feed-person-add"><Plus size={13} /></span></span><span>Tu publicación</span>
              </motion.button>
              {authors.map(author => <motion.button type="button" key={author.id} className="feed-person" aria-pressed={selectedAuthor?.id === author.id} aria-label={`Ver publicaciones de ${author.full_name || 'miembro'}`} title={author.full_name || 'Miembro'} onClick={() => setSelectedAuthor(selectedAuthor?.id === author.id ? null : author)} whileTap={reduced ? undefined : { scale: 0.95 }}>
                <span className="feed-person-portrait"><ProfileAvatar profile={author} className="h-[58px] w-[58px]" /></span><span>{author.full_name?.split(' ')[0] || 'Miembro'}</span>
              </motion.button>)}
              {!authors.length && !loading && <Link to="/sociedades" className="feed-person"><span className="feed-person-portrait feed-person-discover"><Users size={26} /></span><span>Sociedades</span></Link>}
            </div>
            <nav aria-label="Filtrar publicaciones" className="feed-tabs">
              {FEED_FILTERS.map(filter => <button type="button" key={filter.id} aria-pressed={activeFilter === filter.id} onClick={() => { setSelectedAuthor(null); setActiveFilter(filter.id); }}>
                {filter.label}{activeFilter === filter.id && <motion.span className="feed-tab-indicator" layoutId="feed-tab" transition={{ duration: reduced ? 0 : 0.22 }} />}
              </button>)}
            </nav>
            {selectedAuthor && <div className="feed-author-filter"><span>Publicaciones de <strong>{selectedAuthor.full_name}</strong></span><button type="button" aria-label="Ver todas las personas" title="Ver todas las personas" onClick={() => setSelectedAuthor(null)} className="feed-icon"><X size={17} /></button></div>}
            {error ? <div role="alert" className="feed-feedback">No se pudieron cargar las publicaciones. <button onClick={() => getPosts(activeFilter)} className="underline underline-offset-4" type="button">Reintentar</button></div>
              : loading ? <div className="feed-posts" role="status" aria-label="Cargando publicaciones">{[1, 2].map(item => <div key={item} className="feed-skeleton animate-pulse"><div className="flex items-center gap-3 py-4"><div className="h-9 w-9 rounded-full bg-white/10" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-white/10" /><div className="h-2 w-24 rounded bg-white/5" /></div></div><div className="aspect-square bg-white/5" /><div className="my-5 h-3 w-4/5 bg-white/5" /></div>)}</div>
                : visiblePosts.length ? <div className="feed-posts">{visiblePosts.map((post, index) => <PostCard key={post.id} {...post} entranceIndex={index} onToggleLike={(id, liked) => liked ? likePost(id) : unlikePost(id)} />)}</div>
                  : <div className="feed-empty"><Users size={32} /><h2>{selectedAuthor ? 'Sin publicaciones para mostrar.' : `Todavía no hay publicaciones${activeFilter === 'Todos' ? '.' : ' en esta categoría.'}`}</h2><button type="button" onClick={openComposer}>Comparte la primera<ArrowUpRight size={16} /></button></div>}
          </div>
          <aside className="feed-sidebar" aria-label="Nuestra comunidad">
            <div className="feed-sidebar-profile"><ProfileAvatar profile={profile} metadata={user?.user_metadata} className="h-12 w-12" /><div><strong>{profile?.full_name || 'Bienvenido a UJELADEA'}</strong><span>{profile?.church_name || 'Un lugar para compartir tu fe'}</span></div></div>
            <motion.button type="button" onClick={openComposer} className="feed-compose" whileTap={reduced ? undefined : { scale: 0.98 }}><ImagePlus size={21} /><span>Comparte algo hoy</span><Plus size={17} /></motion.button>
            <section className="feed-sidebar-section"><h2>Más allá del feed</h2>
              <Link to="/estudios" className="feed-sidebar-link"><span className="feed-link-icon"><BookOpen size={21} /></span><span>Un momento con Dios<small>Estudios bíblicos</small></span><ArrowUpRight size={16} /></Link>
              <Link to="/himnario" className="feed-sidebar-link"><span className="feed-link-icon"><Music2 size={21} /></span><span>Una misma voz<small>Nuestro himnario</small></span><ArrowUpRight size={16} /></Link>
              <Link to="/sociedades" className="feed-sidebar-link"><span className="feed-link-icon"><Users size={21} /></span><span>Encuentra tu comunidad<small>Sociedades de jóvenes</small></span><ArrowUpRight size={16} /></Link>
            </section>
            {!user && <Link to="/register" className="feed-join">Únete a la comunidad<ArrowUpRight size={16} /></Link>}
            <footer className="feed-sidebar-foot"><p>UJELADEA · Distrito El Alto</p><p>Somos uno en Cristo.</p></footer>
          </aside>
        </div>
      </main>
      <AnimatePresence>{published && <motion.div role="status" className="feed-toast" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={18} />Publicación compartida<button aria-label="Cerrar confirmación" type="button" onClick={() => setPublished(false)}><X size={16} /></button></motion.div>}</AnimatePresence>
      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={publish} isSubmitting={isSubmitting} />
    </div>
  </MotionConfig>;
}
