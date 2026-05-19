
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Post, AdCampaign, PostType, Story, GroupedStory, CyberEvent, ChatConversation, Page } from '../types';
import { getPosts, getAds, getStories, getUsers, toggleFollowUser, getEvents, getChats, joinGroup, markStoryAsViewed, getPromotedItems } from '../services/storageService';
import { safeJsonStringify } from '../lib/utils';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import AdCard from './AdCard';
import StoryViewerModal from './StoryViewerModal';
import StoryCreator from './StoryCreator';
import GroupDiscoveryCard from './GroupDiscoveryCard';
import { PlusIcon, ArrowPathIcon, RocketLaunchIcon, ChevronUpIcon, FireIcon, SparklesIcon, CalendarIcon, UserGroupIcon, StarIcon, ArrowTrendingUpIcon, PlayIcon, FilmIcon } from '@heroicons/react/24/outline';
import { TrophyIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface FeedPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  params?: Record<string, string>;
}

const ITEMS_PER_PAGE = 10;

type FeedItem = 
  | Post 
  | AdCampaign 
  | ChatConversation 
  | { type: 'SUGGESTIONS' } 
  | { type: 'REELS_SHELF'; items: Post[] } 
  | { type: 'GROUPS_SHELF'; items: ChatConversation[] };

const FeedPage: React.FC<FeedPageProps> = ({ currentUser, onNavigate, refreshUser, params }) => {
  const { t } = useTranslation();
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<FeedItem[]>([]);
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [stories, setStories] = useState<GroupedStory[]>([]);
  const [promotedItems, setPromotedItems] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'reels' | 'videos'>('all');
  const observerTarget = useRef<HTMLDivElement>(null);
  const createPostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA' && 
            !(document.activeElement as HTMLElement)?.isContentEditable) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        if (visualViewport.height < window.innerHeight * 0.8) {
          setIsKeyboardVisible(true);
        } else if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsKeyboardVisible(false);
        }
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (params?.showCreate === 'true') {
      setTimeout(() => {
        createPostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [params]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
        setLoading(true);
        setFeedError(false);
    }
    
    try {
        const [allPosts, allAds, allUsers, allStories, allChats, promoted] = await Promise.all([
          getPosts(currentUser).catch(() => []),
          getAds().catch(() => []),
          getUsers(currentUser).catch(() => []),
          getStories(currentUser.id).catch(() => []),
          getChats(currentUser.id).catch(() => []),
          getPromotedItems().catch(() => [])
        ]);

        // Filtrar Posts Normais e Reels - APENAS SEGUIDOS OU PRÓPRIOS E NÃO BLOQUEADOS
        const myFollows = currentUser.followedUsers || [];
        const myBlocked = currentUser.blockedUserIds || [];
        const publicPosts = (allPosts || []).filter(p => !myBlocked.includes(p.userId));
        const userAge = (Date.now() - currentUser.birthDate) / (31557600000); // Years approximation

        const filteredPosts = publicPosts.filter(p => {
          const isOwnOrFollowed = p.userId === currentUser.id || myFollows.includes(p.userId);
          
          if (p.isBoosted) {
              // Targeting for boosted posts (Auction Discovery)
              if (p.minAge && userAge < p.minAge) return false;
              if (p.maxAge && userAge > p.maxAge) return false;
              if (p.targetLocations && p.targetLocations.length > 0 && currentUser.country) {
                 if (!p.targetLocations.includes(currentUser.country)) return false;
              }
              return true;
          }
          
          return isOwnOrFollowed;
        });

        const auctionSort = (a: Post, b: Post) => {
          const now = Date.now();
          const bidA = (a.isBoosted && a.boostExpires && a.boostExpires > now) ? (a.boostBid || 0) : 0;
          const bidB = (b.isBoosted && b.boostExpires && b.boostExpires > now) ? (b.boostBid || 0) : 0;
          
          if (bidB !== bidA) return bidB - bidA;
          return (b.timestamp || 0) - (a.timestamp || 0);
        };

        const normalPosts = filteredPosts.filter(p => p.type !== PostType.REEL).sort(auctionSort);
        
        // Use publicPosts for specialized tabs to allow discovery
        const globalReels = publicPosts.filter(p => p.type === PostType.REEL).sort(auctionSort);
        const globalVideos = publicPosts.filter(p => p.type === PostType.VIDEO).sort(auctionSort);

        // RIGOROUS AD FILTERING
        const activeAds = (allAds || []).filter(a => {
            if (!a.isActive) return false;
            // Age Filtering
            if (a.minAge && userAge < a.minAge) return false;
            if (a.maxAge && userAge > a.maxAge) return false;
            // Location Filtering
            if (a.locations && a.locations.length > 0 && currentUser.country) {
                if (!a.locations.includes(currentUser.country)) return false;
            }
            return true;
        }).sort((a, b) => {
            // Auction Logic: Prioritize higher bid, then total budget
            const bidA = a.bidAmount || 0;
            const bidB = b.bidAmount || 0;
            if (bidB !== bidA) return bidB - bidA;
            return (b.budget || 0) - (a.budget || 0);
        });
        
        // Filtrar Grupos Públicos
        const publicGroups = (allChats || []).filter(c => 
          c.type === 'GROUP' && 
          c.isPublic && 
          !c.participants?.includes(currentUser.id)
        );

        // Group Stories by User (Filtering blocked users)
        const groupedStoriesMap: Record<string, GroupedStory> = {};
        (allStories || [])
          .filter(s => !myBlocked.includes(s.userId))
          .forEach((item: Story) => {
            const storyUser = (allUsers || []).find(u => u.id === item.userId);
            
            if (!groupedStoriesMap[item.userId]) {
                groupedStoriesMap[item.userId] = {
                    userId: item.userId,
                    userName: storyUser ? `${storyUser.firstName} ${storyUser.lastName}` : (item.userName || t('feed_user')),
                    userProfilePic: storyUser?.profilePicture || item.userProfilePic || DEFAULT_PROFILE_PIC,
                    items: []
                };
            }
            groupedStoriesMap[item.userId].items.push(item);
        });

        const groupedStories = Object.values(groupedStoriesMap).sort((a, b) => {
            if (a.userId === currentUser.id) return -1;
            if (b.userId === currentUser.id) return 1;
            return 0;
        });
        setStories(groupedStories);
        setPromotedItems(promoted || []);
        
        // Safe check for followedUsers array to prevent crash
        // myFollows already declared above

        const suggestions = (allUsers || [])
          .filter(u => u && u.id !== currentUser.id && !myFollows.includes(u.id))
          .sort(() => 0.5 - Math.random())
          .slice(0, 8);
        setSuggestedUsers(suggestions);

        let combined: FeedItem[] = [];
        let adPointer = 0;

        if (activeFeedTab === 'reels') {
          combined = globalReels;
        } else if (activeFeedTab === 'videos') {
          combined = globalVideos;
        } else {
          // Estratégia de Mixagem do Feed (Tab 'all') - Injeções a cada 5 posts
          let injectionPointer = 0;
          
          normalPosts.forEach((post, idx) => {
            combined.push(post);
            const count = idx + 1;
            
            if (count % 5 === 0) {
              // Alternar entre Reels e Sugestões conforme solicitado
              const cycle = injectionPointer % 2;
              
              if (cycle === 0) {
                if (globalReels.length > 0) {
                  combined.push({ type: 'REELS_SHELF', items: globalReels.slice(0, 12) });
                  injectionPointer++;
                } else if (suggestions.length > 0) {
                  // Fallback para sugestões se não houver Reels
                  combined.push({ type: 'SUGGESTIONS' });
                  injectionPointer++;
                }
              } else {
                if (suggestions.length > 0) {
                  combined.push({ type: 'SUGGESTIONS' });
                  injectionPointer++;
                } else if (globalReels.length > 0) {
                  // Fallback para Reels se não houver Sugestões
                  combined.push({ type: 'REELS_SHELF', items: globalReels.slice(0, 12) });
                  injectionPointer++;
                }
              }

              // Injetar Grupos a cada 15 posts se houver
              if (count % 15 === 0 && publicGroups.length > 0) {
                combined.push({ type: 'GROUPS_SHELF', items: publicGroups.slice(0, 5) });
              }
            }

            // Injeção de ADS para não-premium (intervalo diferente para não encavalar)
            if (!currentUser.isPremium && count % 7 === 0 && adPointer < activeAds.length) {
                combined.push(activeAds[adPointer]);
                adPointer++;
            }
          });
        }

        setAllItems(combined);
        
        if (isRefresh) {
            setVisibleItems(combined.slice(0, displayLimit));
        } else {
            setVisibleItems(combined.slice(0, ITEMS_PER_PAGE));
            setDisplayLimit(ITEMS_PER_PAGE);
        }
    } catch (e) {
        console.error("Erro crítico ao carregar feed:", safeJsonStringify(e));
        setFeedError(true);
    } finally {
        setLoading(false);
    }
  }, [currentUser.id, currentUser.followedUsers, currentUser.blockedUserIds, currentUser.isPremium, displayLimit, t, onNavigate, refreshUser, activeFeedTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadMoreItems = useCallback(() => {
    if (loadingMore || visibleItems.length >= allItems.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      const nextLimit = displayLimit + ITEMS_PER_PAGE;
      setVisibleItems(allItems.slice(0, nextLimit));
      setDisplayLimit(nextLimit);
      setLoadingMore(false);
    }, 400);
  }, [displayLimit, allItems, loadingMore, visibleItems.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && visibleItems.length < allItems.length) {
        loadMoreItems();
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadMoreItems, visibleItems.length, allItems.length]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 1000);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoin = async (groupId: string) => {
    await joinGroup(groupId, currentUser.id);
    loadData(true);
  };

  const handleFollow = async (targetId: string) => {
    // Optimistic Update
    const prevFollows = [...(currentUser.followedUsers || [])];
    const isFollowing = prevFollows.includes(targetId);
    let newFollows = isFollowing ? prevFollows.filter(id => id !== targetId) : [...prevFollows, targetId];
    
    // We can't update currentUser directly here as it's a prop, 
    // but refreshUser will update it in App.tsx. 
    // To be "simultaneous", we manually trigger a reload with the NEW following list if possible.
    
    await toggleFollowUser(currentUser.id, targetId);
    refreshUser(); 
    
    // The key to Request 5: immediate feedback
    setTimeout(() => {
        loadData(true);
    }, 100);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const isAtEnd = visibleItems.length >= allItems.length && allItems.length > 0;
  const hasMyStory = stories.some(s => s.userId === currentUser.id);

  const renderedItems = useMemo(() => {
    return visibleItems.map((item: any, idx) => {
        if (item.authorName) { 
          // Fix: Pass handleFollow to PostCard so it actually works
          return <PostCard key={item.id} post={item as Post} currentUser={currentUser} onNavigate={onNavigate} onFollowToggle={handleFollow} refreshUser={refreshUser} onPostUpdatedOrDeleted={() => loadData(true)} onPinToggle={() => loadData(true)} />;
        }
        if (item.bidAmount !== undefined && item.title) { 
          return <AdCard key={item.id} ad={item as AdCampaign} rank={idx} />;
        }
        if (item.type === 'SUGGESTIONS') {
          return (
            <div key="sugg" className="rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden animate-fade-in border-4 border-white/10" style={{ backgroundColor: 'var(--brand-color)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 pointer-events-none"></div>
                <SparklesIcon className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10 rotate-12" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                      <h4 className="font-black text-xl tracking-tighter flex items-center gap-2"><FireIcon className="h-6 w-6 text-yellow-400" /> {t('networking_label')}</h4>
                      <p className="text-white font-bold text-[11px] uppercase tracking-widest drop-shadow-sm opacity-80">{t('networking_sugg')}</p>
                  </div>
                  <button onClick={() => loadData(true)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"><ArrowPathIcon className="h-5 w-5"/></button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar relative z-10 snap-x">
                  {suggestedUsers.map(u => (
                    <div key={u.id} className="bg-white/10 backdrop-blur-md p-3 rounded-[1.8rem] min-w-[130px] flex flex-col items-center text-center border border-white/20 group hover:bg-white/20 transition-all snap-start shadow-lg">
                        <img src={u.profilePicture || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-white/40 shadow-xl group-hover:scale-110 transition-transform" />
                        <p className="font-black text-xs truncate w-full mb-0.5 text-white shadow-sm">{u.firstName || t('member')}</p>
                        <p className="text-[9px] font-bold uppercase mb-3 tracking-wide truncate w-full shadow-sm opacity-90" style={{ color: 'var(--brand-light)' }}>{u.lastName || t('nav_conexoes').toLowerCase()}</p>
                        <button onClick={() => handleFollow(u.id)} className="w-full bg-white py-2.5 rounded-xl font-black text-[9px] uppercase shadow-md active:scale-95 transition-all hover:bg-gray-50" style={{ color: 'var(--brand-color)' }}>{t('follow')}</button>
                    </div>
                  ))}
                </div>
            </div>
          );
        }
        if (item.type === 'REELS_SHELF') {
          return (
            <div key="reels-shelf" className="">
              <div className="flex items-center gap-2 mb-3 px-2">
                  <FilmIcon className="h-5 w-5 text-purple-600" />
                  <h3 className="font-black text-base dark:text-white uppercase tracking-tight">{t('trending_reels')}</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x px-1">
                  {item.items.map((reel: Post) => (
                    <div 
                      key={reel.id} 
                      onClick={() => onNavigate('reels-page', { startPostId: reel.id })}
                      className="relative min-w-[120px] h-[200px] rounded-[1.2rem] overflow-hidden cursor-pointer group shadow-md snap-start border border-gray-100 dark:border-white/5"
                    >
                      <video src={reel.reel?.videoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <PlayIcon className="h-8 w-8 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-[9px] font-bold line-clamp-1 leading-tight mb-0.5">{reel.reel?.description}</p>
                          <p className="text-white/70 text-[7px] font-black uppercase">@{reel.authorName}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        }
        if (item.type === 'GROUPS_SHELF') {
          return (
            <div key="groups-shelf" className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 mb-3">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="font-black text-base dark:text-white uppercase tracking-tight">{t('communities')}</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x">
                  {item.items.map((group: ChatConversation) => (
                    <div key={group.id} className="min-w-[220px] snap-start">
                      <GroupDiscoveryCard group={group} onJoin={() => handleJoin(group.id)} />
                    </div>
                  ))}
              </div>
            </div>
          );
        }
        return null;
    });
  }, [visibleItems, currentUser, onNavigate, loadData, refreshUser, suggestedUsers]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 md:px-6 lg:px-8 pt-0 pb-4 md:pt-0 md:pb-6 relative">
      <div className={`fixed bottom-28 md:bottom-12 right-4 md:right-8 z-[100] flex flex-col gap-3 transition-all duration-300 ${isKeyboardVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        {showScrollTop && (
          <button onClick={scrollToTop} className="bg-white dark:bg-darkcard text-blue-600 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 animate-fade-in active:scale-95 transition-all">
            <ChevronUpIcon className="h-6 w-6 stroke-[3]" />
          </button>
        )}
        <button 
          onClick={() => onNavigate('ads')} 
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-[0_15px_30px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          title={t('create_ad')}
        >
          <RocketLaunchIcon className="h-7 w-7" />
        </button>
      </div>

      {/* PROMOTED & STORIES AREA */}
      {(promotedItems.length > 0 || stories.length > 0) &&
        <div className="mb-6 relative z-20">
          <div className="flex items-center gap-2 mb-3 px-2">
             <StarIcon className="h-4 w-4 text-emerald-500" />
             <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Destaques & Conexões</h3>
          </div>
          <div className="bg-gray-50/50 dark:bg-white/5 rounded-[2.5rem] p-2">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar snap-x">
              {/* STICKY ADD STORY BUTTON */}
              <div className="sticky left-0 z-40 bg-transparent pr-4 flex-shrink-0">
                 <div 
                   onClick={() => setIsCreatingStory(true)}
                   className="flex flex-col items-center gap-1 group cursor-pointer"
                 >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-darkcard shadow-xl group-hover:scale-105 active:scale-95 transition-all">
                       <PlusIcon className="h-8 w-8 md:h-10 md:w-10 stroke-[3]" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                      {t('feed_add')}
                    </span>
                 </div>
              </div>

              {/* PROMOTED ITEMS */}
              {promotedItems.map((item) => (
                  <div 
                      key={item.id}
                      onClick={() => {
                        if (item.promoteType === 'product') onNavigate?.('product-detail', { productId: item.id });
                        else if (item.promoteType === 'ad') window.open(item.linkUrl, '_blank');
                        else if (item.promoteType === 'post') {
                          if (item.type === PostType.REEL) onNavigate?.('reels-page', { startPostId: item.id });
                          else onNavigate?.('post-detail', { postId: item.id });
                        }
                      }}
                      className="min-w-[260px] sm:min-w-[300px] bg-white dark:bg-darkcard rounded-[2rem] border border-blue-500/20 overflow-hidden shadow-lg snap-start cursor-pointer group active:scale-[0.98] transition-all"
                  >
                      <div className="relative aspect-video">
                          <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                          <div className="absolute top-3 left-3 px-3 py-1 bg-blue-600/90 text-white text-[8px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">
                              {item.promoteType === 'product' ? 'Destaque' : item.promoteType === 'ad' ? 'Anúncio' : 'Patrocinado'}
                          </div>
                          {item.promoteType === 'post' && (
                             <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <img src={item.authorProfilePic || item.userProfilePic || DEFAULT_PROFILE_PIC} className="w-6 h-6 rounded-full border border-white/50" />
                                <span className="text-white text-[9px] font-black drop-shadow-md">@{item.authorName || item.userName}</span>
                             </div>
                          )}
                      </div>
                  </div>
              ))}

            {/* STORIES LIST */}
            {stories.map((story) => (
              <div 
                key={story.userId} 
                onClick={() => setSelectedStoryIndex(stories.findIndex(s => s.userId === story.userId))} 
                className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px] md:min-w-[80px] flex-shrink-0 snap-start active:scale-95 transition-all"
              >
                 <div className="relative p-0.5">
                    <div className={`absolute inset-0 rounded-full border-2 ${story.items.every(i => i.views?.includes(currentUser.id)) ? 'border-gray-200 dark:border-white/10' : 'border-emerald-500'}`}></div>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-white dark:border-darkbg shadow-lg">
                      <img src={story.userProfilePic || DEFAULT_PROFILE_PIC} className="w-full h-full object-cover" alt="" />
                    </div>
                 </div>
                 <span className="text-[9px] md:text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate w-[70px] md:w-[80px] text-center">
                    {(story.userName || t('feed_user')).split(' ')[0]}
                 </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      }

      {/* FALLBACK BUTTON IF NO ITEMS */}
      {promotedItems.length === 0 && stories.length === 0 && (
         <div className="mb-6 flex justify-start px-2">
            <div 
              onClick={() => setIsCreatingStory(true)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
               <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-darkcard shadow-xl group-hover:scale-105 active:scale-95 transition-all">
                  <PlusIcon className="h-8 w-8 stroke-[3]" />
               </div>
               <span className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                 {t('feed_add')}
               </span>
            </div>
         </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8 space-y-2">
          {/* TAB SWITCHER */}
          <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1.5 rounded-3xl border border-gray-100 dark:border-white/10 w-full overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveFeedTab('all')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              {t('feed_for_you')}
            </button>
            <button 
              onClick={() => setActiveFeedTab('reels')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'reels' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              {t('feed_reels')}
            </button>
            <button 
              onClick={() => setActiveFeedTab('videos')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'videos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              {t('feed_videos')}
            </button>
          </div>

          <div ref={createPostRef}>
            <CreatePost currentUser={currentUser} onPostCreated={() => loadData(true)} refreshUser={refreshUser} />
          </div>
          
          <div className="space-y-px">
            {feedError ? (
                <div className="py-20 text-center flex flex-col items-center">
                    <p className="text-red-500 font-bold mb-4">{t('feed_load_error')}</p>
                    <button 
                        onClick={() => loadData(true)} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700 transition-all"
                    >
                        {t('try_again')}
                    </button>
                </div>
            ) : loading ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('loading_feed')}</p>
              </div>
            ) : (
              <>
                {renderedItems}

                <div ref={observerTarget} className="h-24 flex flex-col items-center justify-center">
                  {loadingMore && (
                    <>
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('loading_dots')}</p>
                    </>
                  )}
                  {isAtEnd && !loadingMore && (
                    <div className="flex flex-col items-center gap-2 opacity-50 py-8">
                       <CheckCircleIcon className="h-8 w-8 text-green-500" />
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t('end_of_content')}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        <aside className="hidden lg:block lg:col-span-4 space-y-6">
           <div className="sticky top-24 space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                 <RocketLaunchIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                 <h3 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <TrophyIcon className="h-6 w-6 text-yellow-400" /> CyBerPhone
                 </h3>
                 <p className="text-xs font-bold text-blue-100 mb-6 leading-relaxed">
                   {t('networking_desc')}
                 </p>
                 <button onClick={() => onNavigate('ads')} className="w-full bg-white text-blue-700 py-4 rounded-2xl font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <RocketLaunchIcon className="h-5 w-5" /> {t('create_ad')}
                 </button>
              </div>
           </div>
        </aside>
      </div>
      
      {isCreatingStory && <StoryCreator currentUser={currentUser} onClose={() => setIsCreatingStory(false)} onSuccess={() => { loadData(true); }} />}
      
      {selectedStoryIndex !== null && (
        <StoryViewerModal 
          stories={stories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)} 
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default FeedPage;
