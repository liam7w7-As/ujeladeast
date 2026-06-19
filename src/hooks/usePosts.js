import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const getPosts = useCallback(async (category = 'Todos') => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles (full_name, avatar_url, church_name)
        `)
        .order('created_at', { ascending: false });

      let mappedCategory = '';
      if (category !== 'Todos') {
        if (category === 'Reflexiones') mappedCategory = 'reflexion';
        if (category === 'Devocionales') mappedCategory = 'devocional';
        if (category === 'Anuncios') mappedCategory = 'anuncio';

        if (mappedCategory) {
          query = query.eq('category', mappedCategory);
        }
      }

      const { data, error: err } = await query;
      if (err) throw err;
      
      let finalPosts = data || [];

      if (user && finalPosts.length > 0) {
        // Fetch likes for this user for these posts
        const postIds = finalPosts.map(p => p.id);
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);
        finalPosts = finalPosts.map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id)
        }));
      }

      setPosts(finalPosts);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createPost = async (content, imageFileOrUrl, category) => {
    if (!user) throw new Error('Debes iniciar sesión para publicar.');
    
    let imageUrl = null;
    try {
      if (imageFileOrUrl) {
        if (typeof imageFileOrUrl === 'string') {
          imageUrl = imageFileOrUrl;
        } else {
          const fileExt = imageFileOrUrl.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(filePath, imageFileOrUrl);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

          imageUrl = publicUrlData.publicUrl;
        }
      }

      let mappedCategory = 'reflexion';
      if (category === 'Reflexiones') mappedCategory = 'reflexion';
      if (category === 'Devocionales') mappedCategory = 'devocional';
      if (category === 'Anuncios') mappedCategory = 'anuncio';

      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl,
          category: mappedCategory
        });

      if (insertError) throw insertError;
      
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const likePost = async (postId) => {
    if (!user) throw new Error('Debes iniciar sesión para dar like.');
    try {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });
      
      if (error) throw error;

      // Update local state optimistically
      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return { ...post, likes_count: (post.likes_count || 0) + 1 };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error liking post:', err);
      throw err;
    }
  };

  const unlikePost = async (postId) => {
    if (!user) throw new Error('Debes iniciar sesión para quitar like.');
    try {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .match({ post_id: postId, user_id: user.id });
      
      if (error) throw error;

      // Update local state optimistically
      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return { ...post, likes_count: Math.max(0, (post.likes_count || 0) - 1) };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error unliking post:', err);
      throw err;
    }
  };

  const checkLiked = async (postId) => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
      return !!data;
    } catch (err) {
      console.error('Error checking like status:', err);
      return false;
    }
  };

  const getComments = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  };

  const addComment = async (postId, content) => {
    if (!user) throw new Error('Debes iniciar sesión para comentar.');
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (full_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;

      // Update local posts state (comments_count + 1)
      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return { ...post, comments_count: (post.comments_count || 0) + 1 };
        }
        return post;
      }));

      return data;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId, postId) => {
    if (!user) throw new Error('Debes iniciar sesión.');
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .match({ id: commentId, user_id: user.id });

      if (error) throw error;

      // Update local posts state (comments_count - 1)
      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return { ...post, comments_count: Math.max(0, (post.comments_count || 0) - 1) };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    getPosts,
    createPost,
    likePost,
    unlikePost,
    checkLiked,
    getComments,
    addComment,
    deleteComment
  };
}
