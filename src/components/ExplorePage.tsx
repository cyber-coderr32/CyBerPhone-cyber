import React, { useState, useEffect } from 'react';
import { User, Post, Page, PostType } from '../types';
import { getPosts, getUsers, toggleFollowUser } from '../services/storageService';
import PostCard from './PostCard';
import { 
  SparklesIcon, 
  FireIcon, 
  ArrowTrendingUpIcon, 
  MagnifyingGlassIcon,
  HashtagIcon,
  PlayIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../services/DialogContext';
import Pagination from './Pagination';
import { safeJsonStringify } from '../lib/utils';

const ITEMS_PER_PAGE = 12;

interface ExplorePageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const ExplorePage: React.FC<ExplorePageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const [trends, setTrends] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'trending' | 'foryou' | 'news' | 'entertainment'>('trending');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadExplore = async () => {
      setLoading(true);
      try {
        const allPosts = await getPosts(currentUser);
        // Em um app real, aqui haveria um algoritmo de recomendação
        // Por enquanto, mostramos posts globais que não são do próprio usuário e não são Reels (para diferenciar da ReelsPage)
        const explorePosts = allPosts
          .filter(p => p.userId !== currentUser.id && p.type !== PostType.REEL)
          .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
          .slice(0, 50);
        
        setTrends(explorePosts);
      } catch (error) {
        console.error("Erro ao carregar explorar:", safeJsonStringify(error));
      } finally {
        setLoading(false);
      }
    };
    loadExplore();
  }, [currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const pagedTrends = trends.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(trends.length / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('search-results', { query: searchQuery });
    }
  };

  const categories = [
    { id: 'trending', label: t('trending_global'), icon: FireIcon },
    { id: 'foryou', label: t('trending_foryou'), icon: SparklesIcon },
    { id: 'news', label: t('trending_news'), icon: GlobeAltIcon },
    { id: 'entertainment', label: t('trending_entertainment'), icon: PlayIcon },
  ];

  const popularHashtags = [
    '#CyberPhone', '#GlobalTech', '#Innovation', '#MusicLife', '#Future', '#WorldRising'
  ];

  const handleFollow = async (targetId: string) => {
    try {
      await toggleFollowUser(currentUser.id, targetId);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error("Error following:", safeJsonStringify(error));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 pb-32">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-gray-50/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl pt-2 pb-4">
        <form onSubmit={handleSearch} className="relative group">
          <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder={t('explore_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] py-4 pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none shadow-sm transition-all"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4 mt-2">
           {categories.map((cat) => (
             <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeCategory === cat.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' 
                  : 'bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-gray-200'
                }`}
             >
                <cat.icon className="w-4 h-4" /> {cat.label}
             </button>
           ))}
        </div>
      </div>

      {/* Hero Trending */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
           {loading ? (
             <div className="space-y-6">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white dark:bg-white/5 h-96 rounded-[3rem] animate-pulse border border-gray-100 dark:border-white/10" />
                ))}
             </div>
           ) : pagedTrends.length > 0 ? (
             <>
               <div className="space-y-6">
                 {pagedTrends.map(post => (
                   <PostCard 
                     key={post.id} 
                     post={post} 
                     currentUser={currentUser} 
                     onNavigate={onNavigate} 
                     onFollowToggle={handleFollow} 
                     refreshUser={refreshUser} 
                     onPostUpdatedOrDeleted={refreshUser}
                     onPinToggle={() => {}}
                   />
                 ))}
               </div>
               <Pagination 
                 currentPage={currentPage}
                 totalPages={totalPages}
                 onPageChange={setCurrentPage}
                 itemsPerPage={ITEMS_PER_PAGE}
                 totalItems={trends.length}
               />
             </>
           ) : (
             <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[3rem] border border-gray-100 dark:border-white/10">
                <GlobeAltIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-black uppercase text-xs">Nenhum conteúdo global encontrado</p>
             </div>
           )}
        </div>

        <div className="md:col-span-4 space-y-8">
           {/* Popular Hashtags */}
           <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-tight dark:text-white mb-6 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" /> {t('trending_topics')}
              </h3>
              <div className="space-y-5">
                 {popularHashtags.map((tag, i) => (
                   <div 
                     key={tag} 
                     className="flex items-center justify-between group cursor-pointer"
                     onClick={() => {
                       setSearchQuery(tag);
                       onNavigate('search-results', { query: tag });
                     }}
                   >
                     <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-0.5 tracking-widest">{i + 1} • {t('trending_global')}</p>
                        <p className="text-sm font-black dark:text-white group-hover:text-blue-600 transition-colors uppercase tracking-tighter">{tag}</p>
                     </div>
                     <HashtagIcon className="w-4 h-4 text-gray-300" />
                   </div>
                 ))}
              </div>
              <button className="w-full mt-8 py-3 bg-gray-50 dark:bg-white/10 text-[9px] font-black uppercase rounded-2xl text-blue-600 tracking-widest hover:bg-blue-50 transition-colors">{t('see_more')}</button>
           </div>

           {/* Creators to Follow */}
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <SparklesIcon className="w-32 h-32" />
              </div>
              <h3 className="text-sm font-black uppercase mb-6 relative z-10">{t('featured_creators')}</h3>
              <div className="space-y-4 relative z-10">
                 <p className="text-xs font-medium text-indigo-100 leading-relaxed mb-6 italic">"{t('featured_creators_desc')}"</p>
                 <button 
                   onClick={() => onNavigate('search-results', { query: 'criadores' })}
                   className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                    {t('see_suggestions')}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
