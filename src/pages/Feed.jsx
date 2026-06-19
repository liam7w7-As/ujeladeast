import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import PostCard from '../components/ui/PostCard';
import CreatePostModal from '../components/ui/CreatePostModal';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';

const FILTERS = [
  { id: 'Todos', label: 'Todos', icon: 'all_inclusive' },
  { id: 'Reflexiones', label: 'Reflexiones', icon: 'menu_book' },
  { id: 'Devocionales', label: 'Devocionales', icon: 'self_improvement' },
  { id: 'Anuncios', label: 'Anuncios', icon: 'campaign' }
];

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { posts, loading, error, getPosts, createPost, likePost, unlikePost } = usePosts();

  useEffect(() => {
    getPosts(activeFilter);
  }, [activeFilter, getPosts]);

  const handleOpenModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsModalOpen(true);
  };

  const handleCreatePost = async (content, imageFile, category) => {
    setIsSubmitting(true);
    try {
      await createPost(content, imageFile, category);
      setIsModalOpen(false);
      // Reload posts
      getPosts(activeFilter);
    } catch (err) {
      alert(err.message || 'Error al publicar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId, isLikedNow) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isLikedNow) {
      await likePost(postId);
    } else {
      await unlikePost(postId);
    }
  };

  return (
    <PageShell activeItem="feed">
      <main className="flex-grow pt-[120px] pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 z-10">
        
        <header className="col-span-1 md:col-span-12 mb-8">
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile md:font-headline-xl md:text-headline-xl text-on-surface mb-2 tracking-tight">Feed</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Reflexiones y publicaciones de la comunidad</p>
        </header>

        <aside className="col-span-1 md:col-span-3 lg:col-span-2 hidden md:block">
          <div className="sticky top-28 bg-glass-bg border border-surface-border rounded-xl p-4 backdrop-blur-xl">
            <h3 className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-4">Filtros</h3>
            <nav className="flex flex-col space-y-2">
              {FILTERS.map(filter => (
                <button 
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`text-left w-full px-3 py-2 font-body-md text-body-md rounded-r-lg transition-colors flex items-center justify-between group ${
                    activeFilter === filter.id 
                      ? 'bg-primary-container/20 text-primary border-l-2 border-primary' 
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-l-2 border-transparent'
                  }`}>
                  <span>{filter.label}</span>
                  <span className={`material-symbols-outlined text-[18px] ${activeFilter === filter.id ? 'opacity-70 group-hover:opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>{filter.icon}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="col-span-1 md:hidden overflow-x-auto pb-4 flex gap-2 no-scrollbar">
          {FILTERS.map(filter => (
             <button 
               key={filter.id}
               onClick={() => setActiveFilter(filter.id)}
               className={`whitespace-nowrap px-4 py-2 rounded-full font-label-sm text-label-sm border ${
                 activeFilter === filter.id
                   ? 'bg-primary-container text-white border-primary-container'
                   : 'bg-glass-bg text-on-surface-variant border-surface-border hover:border-surface-variant'
               }`}>
               {filter.label}
             </button>
          ))}
        </div>

        <div className="col-span-1 md:col-span-9 lg:col-span-7 flex flex-col space-y-6">
          <div 
            onClick={handleOpenModal}
            className="bg-glass-bg border border-surface-border rounded-xl p-4 md:p-6 backdrop-blur-xl hover:border-[#8f1937]/50 transition-colors cursor-text group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-surface-border flex-shrink-0">
                <img alt="Tu Avatar" className="w-full h-full object-cover" src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'U'}&background=18181b&color=fff`} />
              </div>
              <div className="flex-grow">
                <div className="w-full bg-transparent border-none text-on-surface font-body-md text-body-md text-surface-variant opacity-70 cursor-text outline-none">Comparte una reflexión...</div>
              </div>
              <button className="hidden md:flex text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5">
                <span className="material-symbols-outlined">image</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl">
              Error cargando posts: {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-glass-bg border border-surface-border rounded-xl p-6 backdrop-blur-xl animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-surface-container-high rounded"></div>
                      <div className="h-3 w-24 bg-surface-container-high rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="h-4 w-full bg-surface-container-high rounded"></div>
                    <div className="h-4 w-5/6 bg-surface-container-high rounded"></div>
                    <div className="h-4 w-4/6 bg-surface-container-high rounded"></div>
                  </div>
                  <div className="h-48 w-full bg-surface-container-high rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            posts.map(post => (
               <PostCard 
                 key={post.id} 
                 {...post} 
                 onToggleLike={handleToggleLike} 
               />
            ))
          ) : (
            <div className="text-center py-12 text-on-surface-variant border border-surface-border border-dashed rounded-xl">
              No hay publicaciones en esta categoría.
            </div>
          )}
        </div>

        <aside className="col-span-1 lg:col-span-3 hidden lg:block">
        </aside>

        <button 
          onClick={handleOpenModal}
          className="fixed bottom-24 right-8 md:bottom-8 md:right-8 w-14 h-14 bg-primary-container text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(143,25,55,0.4)] hover:shadow-[0_0_30px_rgba(143,25,55,0.6)] hover:bg-[#a61d40] transition-all duration-300 z-40 group hover:-translate-y-1"
        >
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
        </button>

      </main>

      <CreatePostModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isSubmitting}
      />
    </PageShell>
  );
}
