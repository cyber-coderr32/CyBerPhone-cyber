import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { getSavedPosts, toggleFollowUser as followUser, unpinPost, pinPost } from '../services/storageService';
import PostCard from './PostCard';
import { BookmarkIcon } from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { safeJsonStringify } from '../lib/utils';

interface SavedPostsPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => void;
}

const SavedPostsPage: React.FC<SavedPostsPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedPosts();
  }, [currentUser]);

  const loadSavedPosts = async () => {
    setLoading(true);
    try {
      const data = await getSavedPosts(currentUser.id);
      setPosts(data);
    } catch (err) {
      console.error("Error fetching saved posts:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      await followUser(currentUser.id, userId);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error("Error toggling follow status:", safeJsonStringify(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
          Itens Salvos
          <BookmarkIcon className="w-6 h-6 text-brand" />
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sua coleção privada de inspirações</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 bg-gray-100 dark:bg-white/5 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[40px] shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
               <BookmarkIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="font-black uppercase text-gray-900 dark:text-white">Nada salvo ainda</h3>
          <p className="text-sm text-gray-500 font-medium max-w-[250px] mt-2">Salve publicações que você gosta para acessá-las rapidamente aqui.</p>
          <button 
            onClick={() => onNavigate('feed')}
            className="mt-6 bg-brand text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand/20 active:scale-95 transition-all"
          >
            Explorar Feed
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PostCard 
                post={post}
                currentUser={currentUser}
                onNavigate={onNavigate}
                onFollowToggle={handleFollowToggle}
                refreshUser={refreshUser}
                onPostUpdatedOrDeleted={loadSavedPosts}
                onPinToggle={async (id, isPinned) => {
                  if (isPinned) await unpinPost(id);
                  else await pinPost(id);
                  loadSavedPosts();
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">CyberPhone Archive</p>
      </div>
    </div>
  );
};

export default SavedPostsPage;
