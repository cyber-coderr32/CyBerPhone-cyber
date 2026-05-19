import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Page, PostType } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { 
  getPosts, 
  getAds, 
  getStores, 
  getProducts, 
  getAffiliateSales,
  getGlobalSettings
} from '../services/storageService';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  VideoCameraIcon, 
  RocketLaunchIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  PlayIcon,
  FilmIcon,
  PlusIcon,
  PresentationChartLineIcon,
  QueueListIcon,
  MegaphoneIcon,
  GiftIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { 
  TrophyIcon, 
  CheckCircleIcon,
} from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { useDialog } from '../services/DialogContext';

interface CreatorCenterPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const CreatorCenterPage: React.FC<CreatorCenterPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [stats, setStats] = useState({
    totalEarnings: currentUser.totalEarnings || 0,
    balance: currentUser.balance || 0,
    followers: currentUser.followers?.length || 0,
    postCount: 0,
    reelCount: 0,
    storeViews: 0,
    productCount: 0,
    affiliateSalesCount: 0
  });
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const POSTS_PER_PAGE = 4;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCreatorStats = async () => {
      setLoading(true);
      try {
        const [posts, ads, stores, sales] = await Promise.all([
          getPosts(currentUser),
          getAds(),
          getStores(),
          getAffiliateSales({ affiliateUserId: currentUser.id })
        ]);

        const myPosts = posts.filter(p => p.userId === currentUser.id);
        const myReels = myPosts.filter(p => p.type === PostType.REEL);
        
        const myStore = stores.find(s => s.userId === currentUser.id);
        let myProductsCount = 0;
        if (myStore) {
          const allProducts = await getProducts();
          myProductsCount = allProducts.filter(p => p.storeId === myStore.id).length;
        }

        setStats(prev => ({
          ...prev,
          postCount: myPosts.length,
          reelCount: myReels.length,
          productCount: myProductsCount,
          affiliateSalesCount: sales.length
        }));
        setUserPosts(myPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (error) {
        console.error("Error loading creator stats:", safeJsonStringify(error));
      } finally {
        setLoading(false);
      }
    };

    loadCreatorStats();
  }, [currentUser.id]);

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02]">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</p>
          <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' && (label.includes('Saldo') || label.includes('Ganhos') || label.includes('Earnings') || label.includes('Balance')) ? `KZ ${value.toLocaleString()}` : value}
          </h3>
        </div>
      </div>
    </div>
  );

  const ActionButton = ({ icon: Icon, label, onClick, color }: any) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/10 transition-all hover:shadow-xl active:scale-95 group relative overflow-hidden`}
    >
      <div className={`absolute inset-0 ${color} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-[10px] font-black uppercase text-gray-900 dark:text-white tracking-tighter text-center">
        {label}
      </span>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 pb-32">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 text-center md:text-left">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <img 
            src={currentUser.profilePicture} 
            className="w-32 h-32 rounded-full border-4 border-white dark:border-darkbg object-cover relative z-10 shadow-2xl" 
            alt={currentUser.firstName} 
          />
          {currentUser.isVerified && (
            <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-1.5 rounded-full z-20 border-4 border-white dark:border-darkbg shadow-lg">
              <CheckBadgeIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">
              {t('creator_center_title', 'Sua Central')}
            </h1>
            <SparklesIcon className="w-8 h-8 text-yellow-400 animate-bounce" />
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">{t('creator_center_subtitle', 'Gerencie seu império no CyBerPhone')}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <div className="bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
               {currentUser.userType === 'CREATOR' ? t('creator_level_pro', 'Criador Nível Pro') : t('premium_member', 'Membro Premium')}
             </div>
             <div className="bg-blue-500/10 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
               {currentUser.monetizationStatus === 'APPROVED' ? t('monetized_account', 'Conta Monetizada') : t('pending_monetization', 'Monetização Pendente')}
             </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('settings')}
            className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-gray-500 hover:text-blue-600 transition-all shadow-sm"
          >
            <QueueListIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onNavigate('monetization')}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            {t('earnings_settings', 'Configurações de Ganhos')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={CurrencyDollarIcon} label={t('total_earnings', 'Total Ganhos')} value={stats.totalEarnings} color="bg-emerald-500" />
        <StatCard icon={ChartBarIcon} label={t('wallet_balance', 'Saldo em Carteira')} value={stats.balance} color="bg-blue-500" />
        <StatCard icon={UserGroupIcon} label={t('active_followers', 'Seguidores Ativos')} value={stats.followers} color="bg-purple-500" />
        <StatCard icon={ArrowTrendingUpIcon} label={t('reels_posts_count', 'Reels & Posts')} value={stats.postCount + stats.reelCount} color="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Actions & Tools */}
        <div className="lg:col-span-8 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-yellow-500" /> {t('creation_tools', 'Ferramentas de Criação')}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ActionButton icon={PlusIcon} label={t('create_post', 'Criar Post')} onClick={() => onNavigate('feed')} color="bg-blue-600" />
              <ActionButton icon={FilmIcon} label={t('new_reel', 'Novo Reel')} onClick={() => onNavigate('feed')} color="bg-purple-600" />
              <ActionButton icon={VideoCameraIcon} label={t('start_live', 'Iniciar Live')} onClick={() => onNavigate('feed')} color="bg-red-600" />
              <ActionButton icon={PlusIcon} label={t('add_status', 'Add Status')} onClick={() => onNavigate('feed')} color="bg-emerald-600" />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <RocketLaunchIcon className="w-6 h-6 text-purple-500" /> {t('recent_content', 'Conteúdo Recente')}
              </h2>
            </div>
            
            <div className="space-y-4">
              {userPosts.length > 0 ? (
                <>
                  {userPosts
                    .slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE)
                    .map(post => (
                      <div key={post.id} className="bg-white dark:bg-white/5 p-4 rounded-[2rem] border border-gray-100 dark:border-white/10 flex items-center gap-4 transition-all hover:bg-gray-50 dark:hover:bg-white/10">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/5">
                          {post.media && post.media.length > 0 ? (
                            <img src={post.media[0].url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {post.type === PostType.REEL ? <FilmIcon className="w-6 h-6" /> : <SparklesIcon className="w-6 h-6" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-black dark:text-white truncate uppercase tracking-tighter">{post.content || t('no_text', 'Sem texto')}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{post.type === PostType.REEL ? 'REEL' : 'POST'}</span>
                            <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">{new Date(post.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-center px-4 border-l border-gray-100 dark:border-white/10">
                          <div>
                            <p className="text-sm font-black dark:text-white">{post.likes?.length || 0}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">{t('likes')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-black dark:text-white">{post.commentCount || 0}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">{t('comments')}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-6 px-2">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                      {t('page_x_of_y', { current: postsPage, total: Math.ceil(userPosts.length / POSTS_PER_PAGE) })}
                    </p>
                    <div className="flex gap-2">
                      <button 
                        disabled={postsPage === 1}
                        onClick={() => setPostsPage(prev => prev - 1)}
                        className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={postsPage === Math.ceil(userPosts.length / POSTS_PER_PAGE)}
                        onClick={() => setPostsPage(prev => prev + 1)}
                        className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('no_content_published', 'Nenhum conteúdo publicado ainda')}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <ShoppingBagIcon className="w-6 h-6 text-indigo-500" /> {t('manage_ecommerce', 'Gerenciar E-Commerce')}
              </h2>
              <button 
                onClick={() => onNavigate('manage-store')}
                className="text-xs font-black uppercase text-blue-600 hover:underline"
              >
                {t('view_all', 'Ver tudo')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 bg-indigo-600/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                 <h4 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stats.productCount}</h4>
                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('active_products', 'Produtos Ativos')}</p>
                 <button onClick={() => onNavigate('manage-store', { tab: 'inventory' })} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">{t('add_product', 'Add Produto')}</button>
              </div>
              <div className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 bg-teal-600/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                 <h4 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stats.affiliateSalesCount}</h4>
                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('affiliate_sales', 'Vendas Afiliado')}</p>
                 <button onClick={() => onNavigate('affiliates')} className="mt-6 w-full py-3 border border-teal-600 text-teal-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-50 active:scale-95 transition-all">{t('view_report', 'Ver Relatório')}</button>
              </div>
              <div className="flex flex-col gap-4">
                 <button 
                   onClick={() => onNavigate('ads')}
                   className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white flex flex-col justify-center gap-2 group shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                 >
                   <MegaphoneIcon className="w-6 h-6 text-blue-200 group-hover:rotate-12 transition-transform" />
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-blue-100 opacity-80">{t('promote')}</p>
                     <p className="text-sm font-black uppercase tracking-tighter">{t('create_ad', 'Criar Anúncio')}</p>
                   </div>
                 </button>
              </div>
            </div>
          </section>

          <section className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <RocketLaunchIcon className="w-64 h-64" />
              </div>
              <div className="relative z-10 max-w-lg">
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{t('channel_trending_title', 'Seu canal está em alta! 🚀')}</h3>
                <p className="text-sm font-medium text-gray-400 mb-8 leading-relaxed">{t('channel_trending_desc', 'Seu conteúdo alcançou mais pessoas nesta semana. Continue produzindo Reels para subir de Nível e aumentar seus ganhos residuais.')}</p>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-black">+15%</p>
                    <p className="text-[9px] font-bold uppercase text-gray-500">{t('impressions', 'Impressões')}</p>
                  </div>
                  <div className="w-px h-10 bg-gray-800"></div>
                  <div className="text-center">
                    <p className="text-2xl font-black">+8%</p>
                    <p className="text-[9px] font-bold uppercase text-gray-500">{t('retention', 'Retenção')}</p>
                  </div>
                </div>
              </div>
          </section>
        </div>

        {/* Right Column: Tips & Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden">
             <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-yellow-500" /> {t('monetization_goals_title', 'Metas de Monetização')}
             </h3>
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-gray-400">{t('followers')}</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white">{(stats.followers / 1000 * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (stats.followers / 1000 * 100))}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-gray-400">{t('watch_time', 'Tempo de Exibição')}</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white">12%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('monetization')}
                  className="w-full text-[10px] font-black uppercase text-blue-600 pt-2 hover:underline"
                >
                  {t('view_detailed_requirements', 'Ver Requisitos Detalhados')}
                </button>
             </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-[2.5rem] p-8 border border-yellow-200/50 dark:border-yellow-500/10">
             <h3 className="text-base font-black uppercase tracking-tight text-yellow-800 dark:text-yellow-400 mb-4 flex items-center gap-2">
                <PresentationChartLineIcon className="w-6 h-6" /> {t('expert_tip', 'Dica do Especialista')}
             </h3>
             <p className="text-xs font-bold text-yellow-900/60 dark:text-yellow-400/60 leading-relaxed mb-6">
               "{t('expert_tip_content', 'Vídeos verticais de 15 a 30 segundos com áudio em alta têm 4x mais chance de viralizar no CyBerPhone.')}"
             </p>
             <button className="text-[10px] font-black uppercase text-orange-600 hover:underline">{t('view_creator_guide', 'Ver Guia do Criador')}</button>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/10 shadow-sm">
             <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white mb-6">{t('upcoming_payments', 'Próximos Pagamentos')}</h3>
             <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl mb-4 border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">{t('direct_sale', 'Venda Direta')}</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">KZ 42.500</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-emerald-500">{t('released', 'Liberado')}</p>
                  <p className="text-[9px] font-bold text-gray-400">12 Mai</p>
                </div>
             </div>
             <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 opacity-60">
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">{t('affiliate')}</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">KZ 8.900</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-orange-500">{t('pending')}</p>
                  <p className="text-[9px] font-bold text-gray-400">15 Mai</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorCenterPage;
