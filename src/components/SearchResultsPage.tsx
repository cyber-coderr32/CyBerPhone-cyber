import React, { useState, useEffect } from 'react';
import { User, Post, Page } from '../types';
import { getUsers, getPosts, toggleFollowUser } from '../services/storageService';
import PostCard from './PostCard';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon, 
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from './Pagination';
import { safeJsonStringify } from '../lib/utils';

const ITEMS_PER_PAGE_PEOPLE = 10;
const ITEMS_PER_PAGE_POSTS = 8;

interface SearchResultsPageProps {
  currentUser: User | null;
  query: string;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => Promise<void>;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ 
  currentUser, 
  query: searchQuery, 
  onNavigate, 
  refreshUser 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts'>('all');
  const [people, setPeople] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInputValue, setSearchInputValue] = useState(searchQuery || '');
  const [currentPagePeople, setCurrentPagePeople] = useState(1);
  const [currentPagePosts, setCurrentPagePosts] = useState(1);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const [allUsers, allPosts] = await Promise.all([
          getUsers(currentUser || undefined),
          getPosts(currentUser || undefined)
        ]);

        const filteredUsers = allUsers.filter(u => 
          !searchQuery ? true : (
            (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );

        const filteredPosts = allPosts.filter(p => 
          !searchQuery ? true : (
            p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.authorName?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );

        setPeople(filteredUsers);
        setPosts(filteredPosts);
      } catch (error) {
        console.error("Erro ao buscar resultados:", safeJsonStringify(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInputValue.trim()) {
      onNavigate('search-results', { query: searchInputValue.trim() });
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!currentUser) return;
    try {
      await toggleFollowUser(currentUser.id, targetId);
      if (refreshUser) await refreshUser();
    } catch (error) {
      console.error("Error following:", safeJsonStringify(error));
    }
  };

  const renderPeopleSliced = (limitItems?: number) => {
    const start = (currentPagePeople - 1) * ITEMS_PER_PAGE_PEOPLE;
    const end = start + ITEMS_PER_PAGE_PEOPLE;
    const items = limitItems ? people.slice(0, limitItems) : people.slice(start, end);
    
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        {items.map(u => (
          <motion.div 
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onNavigate('profile', { userId: u.id })}
            className="flex items-center gap-4 bg-white dark:bg-[#0a0c10] p-4 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-brand/30 transition-all cursor-pointer group shadow-sm"
          >
            <div className="relative">
              <img 
                src={u.profilePicture} 
                alt={`${u.firstName} ${u.lastName}`} 
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-white/5 group-hover:ring-brand/30 transition-all"
              />
              {u.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-brand text-white p-0.5 rounded-full ring-2 ring-white dark:ring-[#0a0c10]">
                  <CheckBadgeIcon className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black dark:text-white truncate uppercase tracking-tight">
                {u.firstName} {u.lastName}
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                UID: {u.id.substring(0, 8)}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleFollow(u.id);
              }}
              className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 group-hover:bg-brand group-hover:text-white transition-all"
            >
              <UserPlusIcon className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] pb-24">
      {/* Search Interface Header */}
      <div className="bg-white dark:bg-[#0a0c10] border-b border-gray-100 dark:border-white/5 pt-6 pb-2 sticky top-[64px] z-40 transition-all">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
            <input 
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full bg-gray-100 dark:bg-white/5 border-2 border-transparent focus:border-brand/30 focus:bg-white dark:focus:bg-white/10 rounded-3xl py-4 pl-14 pr-12 text-sm font-black outline-none transition-all dark:text-white"
            />
            <button 
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          </form>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {(['all', 'people', 'posts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-brand text-white shadow-lg shadow-brand/20 scale-105' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}
                `}
              >
                {tab === 'all' ? 'Tudo' : tab === 'people' ? 'Pessoas' : 'Publicações'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin rounded-full"></div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest animate-pulse">Buscando no CyberPhone...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Results for "All" tab */}
            {activeTab === 'all' && (
              <>
                {people.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Pessoas</h2>
                      <button 
                        onClick={() => setActiveTab('people')}
                        className="text-[10px] font-black uppercase text-brand hover:underline flex items-center gap-1"
                      >
                        Ver todos <ChevronRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                    {renderPeopleSliced(3)}
                  </section>
                )}

                {posts.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Publicações</h2>
                      <button 
                        onClick={() => setActiveTab('posts')}
                        className="text-[10px] font-black uppercase text-brand hover:underline flex items-center gap-1"
                      >
                        Ver todos <ChevronRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-6">
                      {posts.slice(0, 5).map(post => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          currentUser={currentUser} 
                          onNavigate={onNavigate} 
                          refreshUser={refreshUser} 
                          onFollowToggle={handleFollow}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {people.length === 0 && posts.length === 0 && (
                  <div className="text-center py-20 space-y-4 bg-white dark:bg-[#0a0c10] rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-300">
                      <ChatBubbleBottomCenterTextIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black dark:text-white uppercase">Nenhum resultado</h3>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Não encontramos nada para "{searchQuery}"</p>
                    </div>
                  </div>
                )}
              </>
            )}

      {/* Results for "People" tab */}
      {activeTab === 'people' && (
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">{people.length} Pessoas encontradas</h2>
          {people.length > 0 ? (
            <>
              {renderPeopleSliced()}
              <Pagination 
                currentPage={currentPagePeople} 
                totalPages={Math.ceil(people.length / ITEMS_PER_PAGE_PEOPLE)}
                onPageChange={setCurrentPagePeople}
                itemsPerPage={ITEMS_PER_PAGE_PEOPLE}
                totalItems={people.length}
              />
            </>
          ) : (
            <div className="text-center py-20 text-gray-400 font-black uppercase text-[10px] tracking-widest">Nenhuma pessoa encontrada</div>
          )}
        </section>
      )}

      {/* Results for "Posts" tab */}
      {activeTab === 'posts' && (
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">{posts.length} Publicações encontradas</h2>
          <div className="space-y-6">
            {posts.length > 0 ? (
              <>
                {posts.slice((currentPagePosts - 1) * ITEMS_PER_PAGE_POSTS, currentPagePosts * ITEMS_PER_PAGE_POSTS).map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser} 
                    onNavigate={onNavigate} 
                    refreshUser={refreshUser} 
                    onFollowToggle={handleFollow}
                  />
                ))}
                <Pagination 
                  currentPage={currentPagePosts}
                  totalPages={Math.ceil(posts.length / ITEMS_PER_PAGE_POSTS)}
                  onPageChange={setCurrentPagePosts}
                  itemsPerPage={ITEMS_PER_PAGE_POSTS}
                  totalItems={posts.length}
                />
              </>
            ) : (
              <div className="text-center py-20 text-gray-400 font-black uppercase text-[10px] tracking-widest">Nenhuma publicação encontrada</div>
            )}
          </div>
        </section>
      )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
